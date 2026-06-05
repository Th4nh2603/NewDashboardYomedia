import type { ChatProvider } from "./types.js";

/** Max user+assistant turn pairs kept in server short memory per session. */
export const MAX_HISTORY_TURNS = 8;
export const MAX_QUESTION_LENGTH = 1500;

export function getModel(provider: ChatProvider): string {
  if (provider === "openai") {
    return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
  }
  return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-1.5-flash";
}

export function getSystemPrompt(): string {
  return (
    process.env.CHAT_SYSTEM_PROMPT?.trim() ||
    [
      "You are NovaAI assistant for YoMedia internal dashboard.",
      "Reply concise, practical, and safe.",
      "Build Demo is handled via a single server tool call (brand, HTML|Video, attached files) — do not run a multi-step wizard in chat.",
    ].join(" ")
  );
}
