export type ChatAiProvider = "gemini" | "openai";

const STORAGE_KEY = "yomedia.chatAiProvider";

export const CHAT_AI_PROVIDER_OPTIONS: {
  id: ChatAiProvider;
  label: string;
  description: string;
}[] = [
  {
    id: "gemini",
    label: "Gemini",
    description: "Gemini Flash (RAG)",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o mini (RAG)",
  },
];

export function loadChatAiProvider(): ChatAiProvider {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "gemini" || stored === "openai") return stored;
  } catch {
    /* ignore */
  }
  return "gemini";
}

export function saveChatAiProvider(provider: ChatAiProvider): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    /* ignore */
  }
}

export function chatProviderLabel(provider: ChatAiProvider): string {
  return (
    CHAT_AI_PROVIDER_OPTIONS.find((o) => o.id === provider)?.label ?? provider
  );
}
