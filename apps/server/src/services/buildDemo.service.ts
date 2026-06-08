import type { ChatAttachmentMeta } from "../lib/ai/core/types.js";
import { isHttpError } from "../lib/http/errors.js";
import {
  buildDemoExecuteSchema,
  type BuildDemoExecuteInput,
  type BuildDemoInput,
} from "../shared/schemas/buildDemo.schema.js";
import { getBrandLabel } from "./buildDemo/config.js";
import {
  normalizeBuildDemoInput,
  resolveTargetRelativePath,
} from "./buildDemo/common.js";
import { executeCompressAndUpload } from "./buildDemo/compress.js";
import { executeUploadSftp } from "./buildDemo/upload.js";
import {
  buildDefaultVideoPreviewLinks,
  buildYomediaDemoPreviewUrl,
  type VideoPreviewLink,
} from "./preview.service.js";

export type BuildDemoIntent = BuildDemoExecuteInput["intent"];

export type BuildDemoUploadSlice = {
  uploaded: number;
  remoteBase: string;
  imagesInlined: number;
  videoCompressed?: boolean;
  videoFinalBytes?: number;
};

export type BuildDemoSuccess = {
  ok: true;
  intent: BuildDemoIntent;
  actionLabel: string;
  input: BuildDemoInput;
  relativePath: string;
  upload: BuildDemoUploadSlice;
  previewUrl: string | null;
  videoPreviews: VideoPreviewLink[];
};

export type BuildDemoFailure = {
  ok: false;
  message: string;
};

export type BuildDemoResult = BuildDemoSuccess | BuildDemoFailure;

function actionLabelFor(
  demoFormat: BuildDemoInput["demoFormat"],
  intent: BuildDemoIntent,
): string {
  if (demoFormat === "Video") return "Nén TVC (<=4MB) + upload SFTP";
  if (intent === "upload_sftp") return "Upload SFTP trực tiếp";
  return "Nén assets + upload SFTP";
}

export async function executeBuildDemo(
  raw: BuildDemoExecuteInput,
): Promise<BuildDemoResult> {
  const input = buildDemoExecuteSchema.parse(raw);

  const normalized = normalizeBuildDemoInput({
    toolInput: input.toolInput,
    allowedBrands: input.allowedBrands,
  });
  if (!normalized.ok) {
    return { ok: false, message: normalized.message };
  }
  const normalizedInput = normalized.value;
  const intent = input.intent;
  const videoDemo = normalizedInput.demoFormat === "Video";
  const runCompressPath = videoDemo || intent === "compress_demo_assets";

  if (!input.attachments.length) {
    return {
      ok: false,
      message: [
        "Thiếu file đính kèm.",
        "Gửi lại yêu cầu build demo kèm file (HTML/JS/CSS hoặc video .mp4) và thông tin: brand, format (HTML|Video).",
      ].join("\n"),
    };
  }

  let relativePath: string;
  try {
    relativePath = await resolveTargetRelativePath(
      normalizedInput,
      input.attachments as ChatAttachmentMeta[],
    );
  } catch (err) {
    const message = isHttpError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Invalid demo path";
    return { ok: false, message: `Build Demo thất bại: ${message}` };
  }

  try {
    const upload = runCompressPath
      ? await executeCompressAndUpload(
          normalizedInput,
          relativePath,
          input.attachments as ChatAttachmentMeta[],
        )
      : await executeUploadSftp(
          normalizedInput,
          relativePath,
          input.attachments as ChatAttachmentMeta[],
        );

    let previewUrl: string | null = null;
    let videoPreviews: VideoPreviewLink[] = [];
    try {
      if (normalizedInput.demoFormat === "Video") {
        videoPreviews = await buildDefaultVideoPreviewLinks(relativePath);
        previewUrl =
          videoPreviews.find((p) => p.previewUrl)?.previewUrl ?? null;
      } else {
        previewUrl = await buildYomediaDemoPreviewUrl({
          relativePath,
          demoFormat: normalizedInput.demoFormat,
          formatValue: input.toolInput.formatValue,
        });
      }
    } catch {
      // Preview link is optional; upload already succeeded.
    }

    return {
      ok: true,
      intent,
      actionLabel: actionLabelFor(normalizedInput.demoFormat, intent),
      input: normalizedInput,
      relativePath,
      upload,
      previewUrl,
      videoPreviews,
    };
  } catch (err) {
    const message = isHttpError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Unknown upload error";
    return { ok: false, message: `Build Demo thất bại: ${message}` };
  }
}

export function formatBuildDemoChatAnswer(result: BuildDemoResult): string {
  if (!result.ok) return result.message;

  const lines = [
    "Build Demo thành công — đã đẩy lên SFTP.",
    `- Intent: **${result.actionLabel}**`,
    `- Brand: **${getBrandLabel(result.input.brandId)}**`,
    `- Format: **${result.input.demoFormat}**`,
    `- Remote: \`${result.upload.remoteBase}\``,
    `- Files uploaded: **${result.upload.uploaded}**`,
  ];

  if (result.upload.imagesInlined > 0) {
    lines.push(
      `- Images inlined (base64): **${result.upload.imagesInlined}** (ảnh không upload riêng; đã nhúng vào HTML/JS)`,
    );
  }

  if (result.input.demoFormat === "Video") {
    const finalMb =
      typeof result.upload.videoFinalBytes === "number"
        ? (result.upload.videoFinalBytes / (1024 * 1024)).toFixed(2)
        : null;
    lines.push(
      `- TVC <= 4MB: **${result.upload.videoCompressed ? "đã nén" : "đã đúng kích thước, giữ nguyên"}**${finalMb ? ` (${finalMb} MB trên SFTP)` : ""}`,
    );
  }

  const withUrl = result.videoPreviews.filter((p) => p.previewUrl);
  if (withUrl.length > 0) {
    lines.push("- Open Demo:");
    for (const preview of withUrl) {
      lines.push(`  - **${preview.label}**: ${preview.previewUrl}`);
    }
  } else if (result.previewUrl) {
    lines.push(`- Open Demo: ${result.previewUrl}`);
  }

  lines.push("");
  return lines.join("\n");
}

/** Back-compat: markdown answer for Chat tool. */
export async function executeBuildDemoChatAnswer(
  raw: BuildDemoExecuteInput,
): Promise<string> {
  return formatBuildDemoChatAnswer(await executeBuildDemo(raw));
}
