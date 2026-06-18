export type ChatIntent =
  | "GENERAL_CHAT"
  | "RAG_SEARCH"
  | "SQL_QUERY"
  | "MCP_TOOL"
  | "MULTI_INTENT";

export interface AgentResult {
  agent: string;
  output: unknown;
}

export interface ChatAgentResult {
  answer: string;
  data?: unknown;
  sources: unknown[];
  toolCalls: unknown[];
  steps: unknown[];
}
