export type ChatProvider = "gemini" | "openai";

export type Intent = "knowledge_qa" | "free_chat" | "actions";

export type MemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
  contentBase64?: string;
  encoding?: "base64";
};

export type RagAnswerResult = {
  ok: true;
  answer: string;
  provider: ChatProvider;
  intent: Intent;
  sources: string[];
  fallbackUsed: boolean;
  toolCalled?: "time_now" | "help" | "build_demo";
  /** True while server executed Build Demo (upload) on this request. */
  buildDemoProcessing?: boolean;
};
