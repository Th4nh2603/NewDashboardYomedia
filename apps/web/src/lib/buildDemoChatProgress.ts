import {
  extractUploadDemoBrandFromText,
  getBuildDemoBrandOptions,
  resolveCanonicalBuildDemoBrand,
} from "./buildDemoBrands";

type ChatLikeMessage = { role: string; content: string };

function conversationCorpus(
  messages: ChatLikeMessage[],
  currentText: string,
): string {
  const prior = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  return [...prior, currentText].join("\n");
}

function hasSessionFile(
  messages: ChatLikeMessage[],
  hasSelectedFiles: boolean,
): boolean {
  if (hasSelectedFiles) return true;
  return messages.some(
    (m) => m.role === "user" && /\[files?:/i.test(m.content),
  );
}

function hasBuildDemoActionIntent(text: string): boolean {
  return /build[\s-]?demo|demo build|upload demo|upload.*sftp|sftp.*demo|tao demo|tạo demo|lam demo|làm demo|chay build demo|chạy build demo|convert.*upload|upload.*convert|compress|nen|nén/i.test(
    text,
  );
}

function assistantIsWaitingForBuildDemoDetails(
  messages: ChatLikeMessage[],
): boolean {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  if (!lastAssistant) return false;
  return /build demo|upload demo|brand|format|html|video|file/i.test(
    lastAssistant.content,
  );
}

function hasFormatHint(text: string): boolean {
  if (/\bformat\s*[:=]?\s*(video|html)\b/i.test(text)) return true;
  if (/\b(video|mp4|webm|mov)\b/i.test(text) && !/\bhtml\b/i.test(text)) {
    return true;
  }
  if (/\bhtml\b/i.test(text) && !/\b(video|mp4)\b/i.test(text)) {
    return true;
  }
  return false;
}

function resolveBrandFromCorpus(corpus: string): string | null {
  const fromPattern = extractUploadDemoBrandFromText(corpus);
  if (fromPattern) {
    return resolveCanonicalBuildDemoBrand(fromPattern);
  }
  for (const { id, label } of getBuildDemoBrandOptions()) {
    const token = label || id;
    if (!token) continue;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(corpus)) {
      return resolveCanonicalBuildDemoBrand(id) ?? id;
    }
  }
  return null;
}

/** Show in-chat progress only when upload is likely (file + brand + format in session). */
export function shouldShowBuildDemoProgress(
  text: string,
  hasSelectedFiles: boolean,
  messages: ChatLikeMessage[],
): boolean {
  if (!hasSessionFile(messages, hasSelectedFiles)) return false;
  if (
    !hasBuildDemoActionIntent(text) &&
    !assistantIsWaitingForBuildDemoDetails(messages)
  ) {
    return false;
  }
  const corpus = conversationCorpus(messages, text);
  if (!resolveBrandFromCorpus(corpus)) return false;
  return hasFormatHint(corpus);
}
