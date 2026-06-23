import type { z } from "zod";
import type { chatMessageSchema } from "./chat.schema.js";

export type ChatRequest = z.infer<typeof chatMessageSchema>;

export interface AuthenticatedChatContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  allowedMcpTools: string[];
}

export interface ChatSourceDto {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  score: number;
}

export interface ChatToolCallDto {
  serverName: string;
  toolName: string;
  status: "success" | "failed";
  durationMs: number;
}

export interface ChatStepDto {
  agent: string;
  action: string;
  status: "running" | "success" | "failed";
  durationMs?: number;
}

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
  sources?: unknown[];
  toolCalls?: unknown[];
  steps?: unknown[];
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
  allowedMcpTools: string[];
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
  sources?: unknown[];
  toolCalls?: unknown[];
  steps?: unknown[];
  action?: {
    tool: string;
    [key: string]: unknown;
  };
  insufficientContext?: boolean;
}
