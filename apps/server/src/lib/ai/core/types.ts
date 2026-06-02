import type { UserIntentClassification } from "../intent/types.js";

export type ChatAiProvider = "gemini" | "openai";

export type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
};

export type AnswerMode =
  | "delete_demo"
  | "upload_demo"
  | "web"
  | "rag"
  | "clarification"
  | "unsupported";

export type RagAnswerResult = {
  answer: string;
  provider: ChatAiProvider;
  mode: AnswerMode;
  intent?: UserIntentClassification;
  action?: unknown;
  sources: Array<{ source: string; preview: string }>;
  rag: { readyAt: number; sourceCount: number } | null;
};
