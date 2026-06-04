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
  const corpus = conversationCorpus(messages, text);
  if (!resolveBrandFromCorpus(corpus)) return false;
  return hasFormatHint(corpus);
}
