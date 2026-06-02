import {
  extractUploadDemoBrandFromText,
  resolveCanonicalBuildDemoBrand,
} from "../../buildDemoBrands.js";
import {
  detectDeleteDemoIntent,
  extractDeleteDemoPath,
  isDeleteDemoHelpQuestion,
} from "../../chatDemoCommands.js";
import type { ChatAttachmentMeta } from "../core/types.js";

export type UploadDemoActionPlan = {
  intent: "upload_demo";
  tool: "build_demo_convert_upload";
  uploadKind: "html" | "video";
  confidence: number;
  remotePath: string | null;
  brand: string | null;
  demoId: string | null;
  demoValue: string | null;
  overwrite: boolean;
  attachmentsSummary: {
    fileCount: number;
    totalBytes: number;
    textCount: number;
    binaryCount: number;
  };
  requiredInputs: string[];
};

export type DeleteDemoActionPlan = {
  intent: "delete_demo";
  tool: "delete_uploaded_demo";
  remotePath: string | null;
};

export function shouldHandleDeleteDemo(question: string): boolean {
  return detectDeleteDemoIntent(question) && !isDeleteDemoHelpQuestion(question);
}

export function buildDeleteDemoPlan(question: string): DeleteDemoActionPlan {
  return {
    intent: "delete_demo",
    tool: "delete_uploaded_demo",
    remotePath: extractDeleteDemoPath(question),
  };
}

function detectUploadDemoIntent(question: string): boolean {
  return /\b(upload\s*demo|demo\s*upload|upload\s*video\s*demo|video\s*demo\s*upload|convert\s+and\s+upload)\b/i.test(
    question,
  );
}

function isUploadDemoHelpQuestion(question: string): boolean {
  if (!detectUploadDemoIntent(question)) return false;
  return (
    /\b(how\s+to|how\s+do\s+i|instructions?|tutorial|guide|help\s+with)\b/i.test(
      question,
    ) ||
    /(như\s*thế\s*nào|hướng\s*dẫn|cách\s+(upload|tải|đẩy)|làm\s+sa[ou]|làm\s+thế\s+nào|giải\s*thích|cho\s*biết\s*cách)/i.test(
      question,
    )
  );
}

function detectUploadDemoKindFromAttachments(
  attachments: ChatAttachmentMeta[],
): "html" | "video" {
  if (attachments.length === 0) return "html";
  const videoCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["mp4", "webm", "mov"].includes(ext);
  }).length;
  const textCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["html", "htm", "js"].includes(ext);
  }).length;
  if (videoCount > 0 && textCount === 0) return "video";
  return "html";
}

function extractRemotePath(question: string): string | null {
  const m = question.match(
    /(?:path|to|target)\s*[:=]\s*(\/?script\/demo\/[^\s,;]+|[0-9]{4}\/[^\s,;]+)/i,
  );
  if (!m?.[1]) return null;
  return m[1]
    .trim()
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "")
    .replace(/\/+$/, "");
}

function extractBrandFromRemotePath(remotePath: string | null): string | null {
  if (!remotePath) return null;
  const parts = remotePath
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 3) return null;
  const candidate = (parts[2] ?? "").trim();
  return candidate || null;
}

function extractBrand(question: string): string | null {
  return extractUploadDemoBrandFromText(question);
}

function extractDemoId(question: string): string | null {
  const m = question.match(
    /\b(?:demoId|demo_id|creativeId|creative_id)\s*[:=]\s*([a-z0-9_-]{2,40})\b/i,
  );
  if (!m?.[1]) return null;
  return m[1].trim();
}

function extractDemoValue(question: string): string | null {
  const explicit = question.match(
    /\b(?:demoValue|demo_value|value|format)\s*[:=]\s*([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (explicit?.[1]) return explicit[1].trim();

  const plain = question.match(
    /\b(?:demoValue|demo_value|value|format)\s+([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (!plain?.[1]) return null;
  return plain[1].trim();
}

export function shouldHandleUploadDemo(question: string): boolean {
  return detectUploadDemoIntent(question) && !isUploadDemoHelpQuestion(question);
}

export function buildUploadDemoPlan(
  question: string,
  attachments: ChatAttachmentMeta[],
): UploadDemoActionPlan {
  const textCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["html", "htm", "js"].includes(ext);
  }).length;
  const videoCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["mp4", "webm", "mov"].includes(ext);
  }).length;
  const binaryCount = videoCount;
  const totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  const overwrite = false;
  const remotePath = extractRemotePath(question);
  const explicitBrand = extractBrand(question);
  const inferredBrand = extractBrandFromRemotePath(remotePath);
  const rawBrand = explicitBrand || inferredBrand;
  const brand = rawBrand ? resolveCanonicalBuildDemoBrand(rawBrand) : null;
  const demoId = extractDemoId(question);
  const demoValue = extractDemoValue(question);
  const uploadKind = detectUploadDemoKindFromAttachments(attachments);
  const requiredInputs: string[] = [];
  if (!brand) requiredInputs.push("brand");
  if (uploadKind !== "video" && !demoId && !demoValue) {
    requiredInputs.push("format");
  }
  if (attachments.length === 0) requiredInputs.push("attachments");
  if (uploadKind === "video" && videoCount !== 1) {
    requiredInputs.push("single_video");
  }
  return {
    intent: "upload_demo",
    tool: "build_demo_convert_upload",
    uploadKind,
    confidence: attachments.length > 0 ? 0.95 : 0.6,
    remotePath,
    brand,
    demoId,
    demoValue,
    overwrite,
    attachmentsSummary: {
      fileCount: attachments.length,
      totalBytes,
      textCount,
      binaryCount,
    },
    requiredInputs,
  };
}
