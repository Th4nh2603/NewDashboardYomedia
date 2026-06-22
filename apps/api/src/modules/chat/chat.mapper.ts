import type {
  ChatInternalResult,
  ChatResponseDataDto,
  ChatResponseDto,
  ChatSourceDto,
  ChatStepDto,
  ChatToolCallDto,
} from "./chat.types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapData(value: unknown): ChatResponseDataDto | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const type = record.type;
  if (
    type !== "table" &&
    type !== "chart" &&
    type !== "metric" &&
    type !== "text"
  ) {
    return undefined;
  }

  return {
    type,
    payload: record.payload,
  };
}

function mapSource(value: unknown): ChatSourceDto | null {
  const record = asRecord(value);
  if (!record) return null;

  const documentId = asString(record.documentId);
  const documentName = asString(record.documentName) ?? asString(record.title);
  const chunkId = asString(record.chunkId);
  const score = asNumber(record.score);

  if (!documentId || !documentName || !chunkId) {
    return null;
  }

  return {
    documentId,
    documentName,
    chunkId,
    content: asString(record.content)?.slice(0, 500) ?? "",
    score: score ?? 0,
  };
}

function mapToolCall(value: unknown): ChatToolCallDto | null {
  const record = asRecord(value);
  if (!record) return null;

  const serverName = asString(record.serverName);
  const toolName = asString(record.toolName);
  const durationMs = asNumber(record.durationMs);
  const status = record.status;

  if (
    !serverName ||
    !toolName ||
    durationMs === undefined ||
    (status !== "success" && status !== "failed")
  ) {
    return null;
  }

  return {
    serverName,
    toolName,
    status,
    durationMs,
  };
}

function mapStep(value: unknown): ChatStepDto | null {
  const record = asRecord(value);
  if (!record) return null;

  const name = asString(record.name);
  const agent = asString(record.agent) ?? name?.split(".")[0];
  const action = asString(record.action) ?? name ?? asString(record.summary);
  const rawStatus = record.status;
  const status =
    rawStatus === "error"
      ? "failed"
      : rawStatus === "skipped"
        ? "success"
        : rawStatus;
  const durationMs = asNumber(record.durationMs);

  if (
    !agent ||
    !action ||
    (status !== "running" && status !== "success" && status !== "failed")
  ) {
    return null;
  }

  return {
    agent,
    action,
    status,
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

function mapArray<T>(items: unknown[] | undefined, mapper: (value: unknown) => T | null): T[] {
  return (items ?? []).map(mapper).filter((item): item is T => item !== null);
}

export function mapChatResultToDto(result: ChatInternalResult): ChatResponseDto {
  return {
    conversationId: result.conversationId,
    messageId: result.messageId,
    answer: result.answer,
    data: mapData(result.data),
    sources: mapArray(result.sources, mapSource),
    toolCalls: mapArray(result.toolCalls, mapToolCall),
    steps: mapArray(result.steps, mapStep),
  };
}
