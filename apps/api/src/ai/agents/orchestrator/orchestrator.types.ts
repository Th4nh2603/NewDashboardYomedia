export type ChatIntent = "rag" | "sql" | "tool" | "general";

export interface IntentResult {
  intent: ChatIntent;
  confidence: number;
  reason: string;
}

export interface AgentResult {
  agent: string;
  output: unknown;
  steps?: unknown[];
}

export interface ChatAgentResult {
  answer: string;
  intent?: ChatIntent;
  agent?: string;
  data?: unknown;
  sources: unknown[];
  toolCalls: unknown[];
  steps: unknown[];
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
}
