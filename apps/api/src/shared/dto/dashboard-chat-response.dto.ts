export interface DashboardChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  data?: {
    type: "table" | "chart" | "metric" | "text";
    payload: unknown;
  };
  sources: Array<{
    documentId: string;
    documentName: string;
    chunkId: string;
    content: string;
    score: number;
  }>;
  toolCalls: Array<{
    serverName: string;
    toolName: string;
    status: "success" | "failed";
    durationMs: number;
  }>;
  steps: Array<{
    agent: string;
    action: string;
    status: "running" | "success" | "failed";
    durationMs?: number;
  }>;
}
