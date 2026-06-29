import type { ChatInternalResult, ChatResponseDto } from "./chat.types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function mapAction(value: unknown): ChatResponseDto["action"] | undefined {
  const record = asRecord(value);
  const tool = asString(record?.tool);
  if (!record || !tool) return undefined;
  return { ...record, tool };
}

export function mapChatResultToDto(result: ChatInternalResult): ChatResponseDto {
  return {
    conversationId: result.conversationId,
    messageId: result.messageId,
    answer: result.answer,
    ...(result.intent ? { intent: result.intent } : {}),
    ...(result.agent ? { agent: result.agent } : {}),
    ...(result.sources ? { sources: result.sources } : {}),
    ...(result.toolCalls ? { toolCalls: result.toolCalls } : {}),
    ...(result.approvals ? { approvals: result.approvals } : {}),
    ...(result.steps ? { steps: result.steps } : {}),
    ...(result.data === undefined ? {} : { data: result.data }),
    ...(result.action ? { action: mapAction(result.action) } : {}),
    ...(result.insufficientContext === undefined
      ? {}
      : { insufficientContext: result.insufficientContext }),
  };
}
