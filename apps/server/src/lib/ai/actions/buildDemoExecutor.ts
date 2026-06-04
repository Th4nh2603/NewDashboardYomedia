import path from "node:path";
import type { ChatAttachmentMeta } from "../core/types.js";
import {
  filterAllowedBrandIds,
  getBrandLabel,
  getProductCateLabel,
  resolveProductCateId,
} from "./buildDemoConfig.js";
import { resolveCanonicalBuildDemoBrand } from "../../buildDemoBrands.js";
import type { BuildDemoFormat, BuildDemoToolInput } from "./types.js";
import {
  sftpPathExists,
  uploadSftpBuffer,
  writeSftpFile,
} from "../../sftp/index.js";
import {
  VIDEO_DEMO_FIXED_REL_PATH,
  buildVideoMakeVastXml,
} from "./makeVastXml.js";
import {
  collectImageBase64Entries,
  isImageAttachment,
  prepareHtmlDemoTextForSftp,
} from "./buildDemoInlineImages.js";
import {
  buildDefaultVideoPreviewLinks,
  buildYomediaDemoPreviewUrl,
} from "../../buildDemoPreviewUrl.js";
import { badRequest, isHttpError } from "../../http/errors.js";

const DEMO_REMOTE_PREFIX = "/script/demo";

function normalizePathToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Final demo folder segment — same rules as Build Demo page (keeps e.g. 480x270). */
function demoFolderSegment(value: string): string {
  return value.trim().replace(/\s+/g, "-").replace(/\/+/g, "-");
}

function isValidDemoFolderSegment(token: string): boolean {
  return token.length > 5;
}

function currentYearMonth(): { year: string; month: string } {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
  };
}

function decodeAttachmentBuffer(att: ChatAttachmentMeta): Buffer {
  const raw = att.contentBase64?.includes(",")
    ? att.contentBase64.split(",")[1]
    : att.contentBase64;
  return Buffer.from(raw || "", "base64");
}

function isHtmlFile(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  return (
    ext === ".html" ||
    ext === ".htm" ||
    mime === "text/html" ||
    mime === "application/xhtml+xml"
  );
}

function isHtmlAttachment(att: ChatAttachmentMeta): boolean {
  if (isHtmlFile(att.name, att.mimeType)) return true;
  const raw = att.contentBase64?.trim() ?? "";
  return raw.startsWith("data:text/html");
}

function isVideoFile(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  return (
    [".mp4", ".webm", ".mov", ".m4v"].includes(ext) ||
    (mime?.startsWith("video/") ?? false)
  );
}

function isTextLikeFile(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  if ([".html", ".htm", ".js", ".css", ".txt", ".xml", ".json"].includes(ext)) {
    return true;
  }
  return (
    (mime?.startsWith("text/") ?? false) ||
    mime === "application/javascript" ||
    mime === "text/javascript"
  );
}

/** e.g. 480x270.html → 480x270 (Build Demo auto folder name). */
function deriveFolderNameFromAttachments(
  attachments: ChatAttachmentMeta[],
): string | null {
  for (const att of attachments) {
    if (!isHtmlAttachment(att)) continue;
    const base = path.posix
      .basename(att.relativePath || att.name)
      .replace(/\.[^.]+$/i, "")
      .trim();
    const token = demoFolderSegment(base);
    if (isValidDemoFolderSegment(token)) return token;
  }
  return null;
}

function resolveHtmlDemoFolderSegment(
  input: BuildDemoToolInput,
  attachments: ChatAttachmentMeta[],
): string {
  const fromHtml = deriveFolderNameFromAttachments(attachments);
  if (fromHtml) return fromHtml;

  const fromAgent = input.folderName?.trim()
    ? demoFolderSegment(input.folderName)
    : "";
  return isValidDemoFolderSegment(fromAgent) ? fromAgent : "";
}

function resolveBrandId(
  raw: string,
  allowedBrands: string[] | null,
): string | null {
  const canonical = resolveCanonicalBuildDemoBrand(raw);
  if (!canonical || !filterAllowedBrandIds(canonical, allowedBrands)) {
    return null;
  }
  return canonical;
}

function buildRootSegments(input: BuildDemoToolInput): string[] {
  const { year, month } = currentYearMonth();
  const brand = normalizePathToken(getBrandLabel(input.brandId));
  const subject = normalizePathToken(
    getProductCateLabel(input.productCateId).toLowerCase(),
  );
  return [year, month, brand, subject];
}

async function remotePathExists(relativePath: string): Promise<boolean> {
  const full = `${DEMO_REMOTE_PREFIX}/${relativePath}`.replace(/\/{2,}/g, "/");
  const result = await sftpPathExists(full, {}, { scope: "demo" });
  return Boolean(result.exists);
}

async function resolveFreeSegment(
  prefixSegments: string[],
  baseSeg: string,
): Promise<string> {
  for (let i = 0; i < 500; i++) {
    const seg = i === 0 ? baseSeg : `${baseSeg}-${i}`;
    const rel = [...prefixSegments, seg].filter(Boolean).join("/");
    if (!(await remotePathExists(rel))) return seg;
  }
  return baseSeg;
}

async function resolveTargetRelativePath(
  input: BuildDemoToolInput,
  attachments: ChatAttachmentMeta[],
): Promise<string> {
  const formatSeg = normalizePathToken(input.demoFormat.toLowerCase());
  const root = buildRootSegments(input);

  if (input.demoFormat === "Video") {
    const folder = input.folderName?.trim()
      ? normalizePathToken(input.folderName)
      : await resolveFreeSegment(root, formatSeg);
    return [...root, folder].filter(Boolean).join("/");
  }

  const folderToken = resolveHtmlDemoFolderSegment(input, attachments);
  if (!isValidDemoFolderSegment(folderToken)) {
    throw badRequest(
      "HTML demo cần file .html tên thư mục > 6 ký tự (vd. 480x270.html) hoặc folderName hợp lệ.",
    );
  }
  const resolvedFolder = await resolveFreeSegment(
    [...root, formatSeg],
    folderToken,
  );
  return [...root, formatSeg, resolvedFolder].filter(Boolean).join("/");
}

async function uploadHtmlDemo(
  relativePath: string,
  attachments: ChatAttachmentMeta[],
): Promise<{
  uploaded: number;
  remoteBase: string;
  imagesInlined: number;
}> {
  const remoteBase = `${DEMO_REMOTE_PREFIX}/${relativePath}`.replace(
    /\/{2,}/g,
    "/",
  );
  const imageEntries = collectImageBase64Entries(attachments);
  let indexHtmlUploaded = false;
  let uploaded = 0;

  for (const att of attachments) {
    if (isImageAttachment(att.name, att.mimeType)) {
      continue;
    }

    const buffer = decodeAttachmentBuffer(att);
    if (buffer.length === 0) continue;

    const rel = (att.relativePath || att.name)
      .replace(/\\+/g, "/")
      .replace(/^\/+/, "");
    const fileName = path.posix.basename(rel);
    const isHtml = isHtmlFile(att.name, att.mimeType);
    const finalName = isHtml && !indexHtmlUploaded ? "index.html" : fileName;
    if (isHtml && !indexHtmlUploaded) indexHtmlUploaded = true;

    const remoteFilePath = `${remoteBase}/${finalName}`.replace(/\/{2,}/g, "/");

    if (
      isTextLikeFile(att.name, att.mimeType) &&
      !isVideoFile(att.name, att.mimeType)
    ) {
      const converted = prepareHtmlDemoTextForSftp(
        buffer.toString("utf8"),
        imageEntries,
      );
      await writeSftpFile(remoteFilePath, converted);
    } else {
      await uploadSftpBuffer(remoteFilePath, buffer);
    }
    uploaded += 1;
  }

  if (uploaded === 0) {
    throw badRequest("Không có file hợp lệ để upload HTML demo.");
  }

  return { uploaded, remoteBase, imagesInlined: imageEntries.length };
}

async function uploadVideoDemo(
  relativePath: string,
  attachments: ChatAttachmentMeta[],
): Promise<{
  uploaded: number;
  remoteBase: string;
  imagesInlined: number;
}> {
  const videoAtt =
    attachments.find((a) => isVideoFile(a.name, a.mimeType)) ?? attachments[0];
  if (!videoAtt?.contentBase64) {
    throw badRequest("Thiếu file video (.mp4) để build demo Video.");
  }

  const remoteBase = `${DEMO_REMOTE_PREFIX}/${relativePath}`.replace(
    /\/{2,}/g,
    "/",
  );
  const videoBuffer = decodeAttachmentBuffer(videoAtt);
  if (videoBuffer.length === 0) {
    throw badRequest("File video rỗng.");
  }

  const videoRemotePath = `${remoteBase}/${VIDEO_DEMO_FIXED_REL_PATH}`.replace(
    /\/{2,}/g,
    "/",
  );
  await uploadSftpBuffer(videoRemotePath, videoBuffer);

  const xmlRemotePath = `${remoteBase}/make-vast.xml`.replace(/\/{2,}/g, "/");
  await writeSftpFile(xmlRemotePath, buildVideoMakeVastXml(relativePath));

  return { uploaded: 2, remoteBase, imagesInlined: 0 };
}

export async function executeBuildDemo(input: {
  toolInput: BuildDemoToolInput;
  attachments: ChatAttachmentMeta[];
  allowedBrands: string[] | null;
}): Promise<string> {
  const brandId = resolveBrandId(input.toolInput.brandId, input.allowedBrands);
  if (!brandId) {
    return "Brand không hợp lệ hoặc tài khoản không được phép dùng brand này.";
  }

  const rawProductCate =
    String(input.toolInput.productCateId ?? "").trim() || "all";
  const productCateId =
    resolveProductCateId(rawProductCate, brandId) ??
    resolveProductCateId(getProductCateLabel(rawProductCate), brandId) ??
    resolveProductCateId("all", brandId);
  if (!productCateId) {
    return `Product category không hợp lệ cho brand **${getBrandLabel(brandId)}**.`;
  }

  const normalizedInput: BuildDemoToolInput = {
    ...input.toolInput,
    brandId,
    productCateId,
    demoFormat: input.toolInput.demoFormat as BuildDemoFormat,
  };

  if (!input.attachments.length) {
    return [
      "Thiếu file đính kèm.",
      "Gửi lại yêu cầu build demo kèm file (HTML/JS/CSS hoặc video .mp4) và thông tin: brand, format (HTML|Video) — subject mặc định all.",
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
    const result =
      normalizedInput.demoFormat === "Video"
        ? await uploadVideoDemo(relativePath, input.attachments)
        : await uploadHtmlDemo(relativePath, input.attachments);

    const lines = [
      "Build Demo thành công — đã đẩy lên SFTP.",
      `- Brand: **${getBrandLabel(brandId)}**`,
      `- Format: **${normalizedInput.demoFormat}**`,
      `- Remote: \`${result.remoteBase}\``,
      `- Files uploaded: **${result.uploaded}**`,
    ];
    if (normalizedInput.demoFormat !== "Video" && result.imagesInlined > 0) {
      lines.push(
        `- Images inlined (base64): **${result.imagesInlined}** (ảnh không upload riêng; đã nhúng vào HTML/JS)`,
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
