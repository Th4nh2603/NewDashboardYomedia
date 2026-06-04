import type { MemoryMessage } from "../core/types.js";
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
  if (isDemoActionIntent(normalized)) {
    return "build_demo";
  }
  return null;
}

/** Build demo + upload demo (single chat action). */
export function isDemoActionIntent(normalized: string): boolean {
  return (
    /build[\s-]?demo|tao demo|tạo demo|lam demo|làm demo|demo build|convert.*upload|upload.*convert|chay build demo|chạy build demo/.test(
      normalized,
    ) ||
    /\bdemo\s+yomedia\b/.test(normalized) ||
    /upload|tai len|tải lên|sftp|gui file|gửi file|up file|upload demo/.test(
      normalized,
    )
  );
}

function historyStartedBuildDemo(history: MemoryMessage[]): boolean {
  return history.some(
    (m) => m.role === "user" && isDemoActionIntent(m.content.trim().toLowerCase()),
  );
}

function assistantInBuildDemoFlow(history: MemoryMessage[]): boolean {
  return history.some(
    (m) =>
      m.role === "assistant" &&
      /build demo|upload demo|product category|định dạng demo|format.*html.*video|brand.*format/i.test(
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
  },
): ActionTool | null {
  const direct = detectTool(text);
  if (direct) return direct;

  if (
    context &&
    isBuildDemoSessionActive({
      history: context.history,
      hasPendingAttachments: context.hasPendingAttachments,
    })
  ) {
    return "build_demo";
  }

  return null;
}
