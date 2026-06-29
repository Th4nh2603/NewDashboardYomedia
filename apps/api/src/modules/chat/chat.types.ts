import type { z } from "zod";
import type { chatMessageSchema } from "./chat.schema.js";

export type ChatRequest = z.infer<typeof chatMessageSchema>;

export interface AuthenticatedChatContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  /** Legacy name retained for compatibility. MCP is not enabled in Agent Core. */
  allowedMcpTools: string[];
  allowedToolCapabilities?: string[];
  allowedBuildDemoBrands?: string[] | null;
}

export interface RagCitationDto {
  documentId: string;
  chunkId: string;
  title: string;
  source?: string;
  page?: number;
  section?: string;
  score?: number;
}

export type ChatSourceDto = RagCitationDto;

export interface ToolCallDto {
  serverName: string;
  toolName: string;
  status: "success" | "failed" | "skipped" | "approval_required";
  durationMs: number;
  requiresApproval?: boolean;
  approvalId?: string;
  summary?: string;
}

export type ChatToolCallDto = ToolCallDto;

export interface ApprovalDto {
  approvalId: string;
  id: string;
  status: "pending";
  toolName: string;
  reason: string;
  inputSummary: Record<string, unknown>;
  createdAt: string;
}

export interface AgentStep {
  agent?: string;
  action?: string;
  name?: string;
  summary?: string;
  status: "running" | "success" | "failed" | "skipped" | "approval_required" | "error";
  durationMs?: number;
  data?: Record<string, unknown>;
}

export type ChatStepDto = AgentStep;

export interface ChatResponseDataDto {
  type: "table" | "chart" | "metric" | "text";
  payload: unknown;
}

export interface ChatResponseDto {
  conversationId: string;
  messageId: string;
  answer: string;
  intent?: string;
  agent?: string;
  sources?: RagCitationDto[];
  toolCalls?: ToolCallDto[];
  approvals?: ApprovalDto[];
  steps?: AgentStep[];
  data?: unknown;
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
}

export interface ChatServiceInput {
  input: ChatRequest;
  auth: AuthenticatedChatContext;
  requestId?: string;
}

export interface ChatExecutionScope {
  userId: string;
  tenantId: string;
  permissions: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  /** Legacy name retained for compatibility. MCP is not enabled in Agent Core. */
  allowedMcpTools: string[];
  allowedToolCapabilities?: string[];
  allowedBuildDemoBrands?: string[] | null;
  requestedBrandId?: string;
  requestedKnowledgeBaseId?: string;
}

export interface ChatInternalResult {
  conversationId: string;
  messageId: string;
  answer: string;
  intent?: string;
  agent?: string;
  data?: unknown;
  sources?: RagCitationDto[];
  toolCalls?: ToolCallDto[];
  approvals?: ApprovalDto[];
  steps?: AgentStep[];
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
}
