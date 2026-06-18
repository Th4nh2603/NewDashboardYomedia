export type AgentStepName =
  | "intent_detection"
  | "agent_selection"
  | "retrieval"
  | "tool_call"
  | "generation"
  | "validation";

export type AgentStepStatus = "success" | "failure";

export type AgentStepLog = {
  runId: string;
  step: AgentStepName;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  status: AgentStepStatus;
  error?: string;
};

export const agentLogRedactionRules = [
  "passwords",
  "access tokens",
  "refresh tokens",
  "API keys",
  "full confidential documents",
  "private user data",
  "unredacted model prompts containing sensitive data",
] as const;
