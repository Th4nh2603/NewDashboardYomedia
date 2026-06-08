import path from "node:path";
import type { ChatAttachmentMeta } from "../../lib/ai/core/types.js";
import {
  filterAllowedBrandIds,
  getBrandLabel,
} from "./config.js";
import { resolveCanonicalBuildDemoBrand } from "../../repositories/brand.repository.js";
import type { BuildDemoFormat, BuildDemoInput } from "../../shared/schemas/buildDemo.schema.js";
import { sftpPathExists } from "../sftp.service.js";
import { badRequest } from "../../lib/http/errors.js";

export type BuildDemoToolInput = BuildDemoInput;

export const DEMO_REMOTE_PREFIX = "/script/demo";

function normalizePathToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

export function decodeAttachmentBuffer(att: ChatAttachmentMeta): Buffer {
  const raw = att.contentBase64?.includes(",")
    ? att.contentBase64.split(",")[1]
    : att.contentBase64;
  return Buffer.from(raw || "", "base64");
}

export function isHtmlFile(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  return (
    ext === ".html" ||
    ext === ".htm" ||
    mime === "text/html" ||
    mime === "application/xhtml+xml"
  );
}

export function isHtmlAttachment(att: ChatAttachmentMeta): boolean {
  if (isHtmlFile(att.name, att.mimeType)) return true;
  const raw = att.contentBase64?.trim() ?? "";
  return raw.startsWith("data:text/html");
}

export function isVideoFile(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  return (
    [".mp4", ".webm", ".mov", ".m4v"].includes(ext) ||
    (mime?.startsWith("video/") ?? false)
  );
}

export function isTextLikeFile(name: string, mime?: string): boolean {
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

export function resolveBrandId(
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
  return [year, month, brand];
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

export async function resolveTargetRelativePath(
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

export function normalizeBuildDemoInput(input: {
  toolInput: BuildDemoToolInput;
  allowedBrands: string[] | null;
}): { ok: true; value: BuildDemoToolInput } | { ok: false; message: string } {
  const brandId = resolveBrandId(input.toolInput.brandId, input.allowedBrands);
  if (!brandId) {
    return {
      ok: false,
      message: "Brand không hợp lệ hoặc tài khoản không được phép dùng brand này.",
    };
  }

  return {
    ok: true,
    value: {
      ...input.toolInput,
      brandId,
      demoFormat: input.toolInput.demoFormat as BuildDemoFormat,
    },
  };
}
