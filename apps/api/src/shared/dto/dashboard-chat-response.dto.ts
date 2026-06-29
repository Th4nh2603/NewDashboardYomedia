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
    status: "success" | "failed" | "skipped" | "approval_required";
    durationMs: number;
    requiresApproval?: boolean;
    approvalId?: string;
    summary?: string;
  }>;
  approvals?: Array<{
    id: string;
    status: "pending";
    toolName: string;
    reason: string;
    inputSummary: Record<string, unknown>;
  }>;
  steps: Array<{
    agent?: string;
    action?: string;
    name?: string;
    summary?: string;
    status: "running" | "success" | "failed" | "skipped" | "approval_required" | "error";
    durationMs?: number;
  }>;
}
