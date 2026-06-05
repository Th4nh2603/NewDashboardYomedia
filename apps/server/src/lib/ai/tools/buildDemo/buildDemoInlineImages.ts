import path from "node:path";
import type { ChatAttachmentMeta } from "../../core/types.js";
import {
  replaceImagesToBase64,
  type ImageBase64Entry,
} from "../../../buildDemoAssets.js";

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
]);

function guessImageMime(name: string, mime?: string): string {
  if (mime?.startsWith("image/")) return mime;
  const ext = path.posix.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
  };
  return map[ext] ?? "image/png";
}

export function isImageAttachment(name: string, mime?: string): boolean {
  const ext = path.posix.extname(name).toLowerCase();
  return IMAGE_EXTS.has(ext) || (mime?.startsWith("image/") ?? false);
}

/** Attachment payload → data URL for CreateJS manifest inlining. */
export function attachmentToImageDataUrl(att: ChatAttachmentMeta): string | null {
  const raw = att.contentBase64?.trim();
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  const payload = raw.includes(",") ? raw.split(",")[1]! : raw;
  const mime = guessImageMime(att.name, att.mimeType);
  return `data:${mime};base64,${payload}`;
}

function imageMatchNames(att: ChatAttachmentMeta): string[] {
  const names = new Set<string>();
  names.add(path.posix.basename(att.name));
  const rel = att.relativePath?.replace(/\\/g, "/");
  if (rel) {
    const leaf = rel.split("/").filter(Boolean).pop();
    if (leaf) names.add(leaf);
  }
  return [...names];
}

/** Collect uploaded images for replaceImagesToBase64 (Build Demo page parity). */
export function collectImageBase64Entries(
  attachments: ChatAttachmentMeta[],
): ImageBase64Entry[] {
  const entries: ImageBase64Entry[] = [];
  const seen = new Set<string>();

  for (const att of attachments) {
    if (!isImageAttachment(att.name, att.mimeType)) continue;
    const dataUrl = attachmentToImageDataUrl(att);
    if (!dataUrl) continue;

    for (const name of imageMatchNames(att)) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ name, base64: dataUrl });
    }
  }

  return entries;
}

export function prepareHtmlDemoTextForSftp(
  rawUtf8: string,
  imageEntries: ImageBase64Entry[],
): string {
  return replaceImagesToBase64(rawUtf8, imageEntries);
}
