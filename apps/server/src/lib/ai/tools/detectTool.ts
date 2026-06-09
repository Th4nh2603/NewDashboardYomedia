import type { MemoryMessage } from "../core/types.js";
import {
  RAG_THRESHOLD,
  scoreKnowledgeQaIntent,
  toSearchableText,
} from "../intent/scoring.js";
import { isDownloadPlacementCodeIntent } from "./placementCodeDownload.js";
import type { ActionTool } from "./types.js";

/** Actions are matched before knowledge/free-chat routing (subject-first intent). */
export function detectTool(text: string): ActionTool | null {
  const normalized = text.trim().toLowerCase();
  if (
    normalized === "help" ||
    normalized === "tro giup" ||
    normalized === "huong dan" ||
    normalized === "hướng dẫn"
  ) {
    return "help";
  }
  if (
    /what time|may gio|mấy giờ|bay gio may gio|time now|gio hien tai/.test(
      normalized,
    )
  ) {
    return "time_now";
  }
  if (isDownloadPlacementCodeIntent(normalized)) {
    return "download_placement_codes";
  }
  if (isCompressDemoIntent(normalized)) {
    return "compress_demo_assets";
  }
  if (isUploadSftpIntent(normalized)) {
    return "upload_sftp_demo";
  }
  return null;
}

export function isCompressDemoIntent(normalized: string): boolean {
  return (
    /build[\s-]?demo|tao demo|tạo demo|lam demo|làm demo|demo build|convert.*upload|upload.*convert|chay build demo|chạy build demo|nen|nén|compress|base64|tvc/.test(
      normalized,
    ) || /\bdemo\s+yomedia\b/.test(normalized)
  );
}

export function isUploadSftpIntent(normalized: string): boolean {
  return /upload|tai len|tải lên|sftp|gui file|gửi file|up file|upload demo/.test(
    normalized,
  );
}

function historyStartedBuildDemo(history: MemoryMessage[]): boolean {
  return history.some(
    (m) =>
      m.role === "user" &&
      (isCompressDemoIntent(m.content.trim().toLowerCase()) ||
        isUploadSftpIntent(m.content.trim().toLowerCase())),
  );
}

function assistantInBuildDemoFlow(history: MemoryMessage[]): boolean {
  return history.some(
    (m) =>
      m.role === "assistant" &&
      /build demo|upload demo|định dạng demo|thương hiệu|đính kèm.*file|file html|file video|format.*html.*video|brand.*format/i.test(
        m.content,
      ),
  );
}

/** Route follow-up turns (brand, format, video…) while a Build Demo session is active. */
export function isBuildDemoSessionActive(input: {
  history: MemoryMessage[];
  hasPendingAttachments: boolean;
}): boolean {
  if (input.hasPendingAttachments) return true;
  if (historyStartedBuildDemo(input.history)) return true;
  if (
    assistantInBuildDemoFlow(input.history) &&
    input.history.some((m) => m.role === "user")
  ) {
    return true;
  }
  return false;
}

export function resolveActionTool(
  text: string,
  context?: {
    history: MemoryMessage[];
    hasPendingAttachments: boolean;
    hasIncomingAttachments?: boolean;
  },
): ActionTool | null {
  const direct = detectTool(text);
  if (direct) return direct;

  if (context?.hasIncomingAttachments) {
    return "upload_sftp_demo";
  }

  if (
    context &&
    isBuildDemoSessionActive({
      history: context.history,
      hasPendingAttachments: context.hasPendingAttachments,
    })
  ) {
    const knowledgeScore = scoreKnowledgeQaIntent(toSearchableText(text));
    if (knowledgeScore >= RAG_THRESHOLD) {
      return null;
    }
    return "compress_demo_assets";
  }

  return null;
}
