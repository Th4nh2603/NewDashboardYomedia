export type ChatIntent = "rag" | "sql" | "tool" | "general";
export type AgentName = "RagAgent" | "SqlAgent" | "GeneralAgent" | "DemoAgent";

export interface IntentResult {
  intent: ChatIntent;
  primaryTask: string;
  confidence: number;
  selectedAgent: AgentName;
  neededCapabilities: string[];
  riskLevel: "low" | "medium" | "high";
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
  approvals?: unknown[];
  steps: unknown[];
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
}
