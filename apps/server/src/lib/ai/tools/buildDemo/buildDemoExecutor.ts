import type { ChatAttachmentMeta } from "../../core/types.js";
import {
  getBrandLabel,
} from "./buildDemoConfig.js";
import type { BuildDemoToolInput } from "../types.js";
import {
  buildDefaultVideoPreviewLinks,
  buildYomediaDemoPreviewUrl,
} from "../../../buildDemoPreviewUrl.js";
import { isHttpError } from "../../../http/errors.js";
import {
  normalizeBuildDemoInput,
  resolveTargetRelativePath,
} from "./buildDemoCommon.js";
import { executeUploadSftp } from "./buildDemoUploadSftpExecutor.js";
import { executeCompressAndUpload } from "./buildDemoCompressExecutor.js";

export type BuildDemoIntent = "upload_sftp" | "compress_demo_assets";

export async function executeBuildDemo(input: {
  toolInput: BuildDemoToolInput;
  attachments: ChatAttachmentMeta[];
  allowedBrands: string[] | null;
  intent: BuildDemoIntent;
}): Promise<string> {
  const normalized = normalizeBuildDemoInput({
    toolInput: input.toolInput,
    allowedBrands: input.allowedBrands,
  });
  if (!normalized.ok) {
    return normalized.message;
  }
  const normalizedInput = normalized.value;
  const videoDemo = normalizedInput.demoFormat === "Video";
  const runCompressPath =
    videoDemo || input.intent === "compress_demo_assets";
  const actionLabel = videoDemo
    ? "Nén TVC (<=4MB) + upload SFTP"
    : input.intent === "upload_sftp"
      ? "Upload SFTP trực tiếp"
      : "Nén assets + upload SFTP";

  if (!input.attachments.length) {
    return [
      "Thiếu file đính kèm.",
      "Gửi lại yêu cầu build demo kèm file (HTML/JS/CSS hoặc video .mp4) và thông tin: brand, format (HTML|Video).",
    ].join("\n");
  }

  let relativePath: string;
  try {
    relativePath = await resolveTargetRelativePath(
      normalizedInput,
      input.attachments,
    );
  } catch (err) {
    const message = isHttpError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Invalid demo path";
    return `Build Demo thất bại: ${message}`;
  }

  try {
    const result = runCompressPath
        ? await executeCompressAndUpload(
            normalizedInput,
            relativePath,
            input.attachments,
          )
        : await executeUploadSftp(normalizedInput, relativePath, input.attachments);

    const lines = [
      "Build Demo thành công — đã đẩy lên SFTP.",
      `- Intent: **${actionLabel}**`,
      `- Brand: **${getBrandLabel(normalizedInput.brandId)}**`,
      `- Format: **${normalizedInput.demoFormat}**`,
      `- Remote: \`${result.remoteBase}\``,
      `- Files uploaded: **${result.uploaded}**`,
    ];
    if (result.imagesInlined > 0) {
      lines.push(
        `- Images inlined (base64): **${result.imagesInlined}** (ảnh không upload riêng; đã nhúng vào HTML/JS)`,
      );
    }
    if (normalizedInput.demoFormat === "Video") {
      const finalMb =
        typeof result.videoFinalBytes === "number"
          ? (result.videoFinalBytes / (1024 * 1024)).toFixed(2)
          : null;
      lines.push(
        `- TVC <= 4MB: **${result.videoCompressed ? "đã nén" : "đã đúng kích thước, giữ nguyên"}**${finalMb ? ` (${finalMb} MB trên SFTP)` : ""}`,
      );
    }

    try {
      if (normalizedInput.demoFormat === "Video") {
        const videoPreviews = await buildDefaultVideoPreviewLinks(relativePath);
        const withUrl = videoPreviews.filter((p) => p.previewUrl);
        if (withUrl.length > 0) {
          lines.push("- Open Demo:");
          for (const preview of withUrl) {
            lines.push(
              `  - **${preview.label}**: ${preview.previewUrl}`,
            );
          }
        }
      } else {
        const previewUrl = await buildYomediaDemoPreviewUrl({
          relativePath,
          demoFormat: normalizedInput.demoFormat,
          formatValue: input.toolInput.formatValue,
        });
        if (previewUrl) {
          lines.push(`- Open Demo: ${previewUrl}`);
        }
      }
    } catch {
      // Preview link is optional; upload already succeeded.
    }

    lines.push("");
    return lines.join("\n");
  } catch (err) {
    const message = isHttpError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : "Unknown upload error";
    return `Build Demo thất bại: ${message}`;
  }
}
