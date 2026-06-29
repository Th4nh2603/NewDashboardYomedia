import type {
  AgentStep,
  ApprovalDto,
  ChatInternalResult,
  RagCitationDto,
  ToolCallDto,
} from "../modules/chat/chat.types.js";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function rec(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function isStepStatus(value: unknown): value is AgentStep["status"] {
  return (
    value === "running" ||
    value === "success" ||
    value === "failed" ||
    value === "skipped" ||
    value === "approval_required" ||
    value === "error"
  );
}

function isToolStatus(value: unknown): value is ToolCallDto["status"] {
  return (
    value === "success" ||
    value === "failed" ||
    value === "skipped" ||
    value === "approval_required"
  );
}

export function normalizeSteps(steps: unknown[]): AgentStep[] {
  return steps.map((step) => {
    const record = asRecord(step);
    return {
      name: str(record.name),
      agent: str(record.agent),
      action: str(record.action),
      status: isStepStatus(record.status) ? record.status : "success",
      summary: str(record.summary),
      durationMs: num(record.durationMs),
      data: rec(record.data),
    };
  });
}

export function normalizeSources(sources: unknown[]): RagCitationDto[] {
  return sources.flatMap((source) => {
    const record = asRecord(source);
    const documentId = str(record.documentId);
    const chunkId = str(record.chunkId);
    const title = str(record.title);
    if (!documentId || !chunkId || !title) return [];
    return [
      {
        documentId,
        chunkId,
        title,
        source: str(record.source),
        page: num(record.page),
        section: str(record.section),
        score: num(record.score),
      },
    ];
  });
}

export function normalizeToolCalls(toolCalls: unknown[]): ToolCallDto[] {
  return toolCalls.flatMap((toolCall) => {
    const record = asRecord(toolCall);
    const toolName = str(record.toolName);
    if (!toolName || !isToolStatus(record.status)) return [];
    return [
      {
        serverName: "backend",
        toolName,
        status: record.status,
        durationMs: num(record.durationMs) ?? 0,
        requiresApproval:
          typeof record.requiresApproval === "boolean"
            ? record.requiresApproval
            : undefined,
        approvalId: str(record.approvalId),
        summary: str(record.summary),
      },
    ];
  });
}

export function normalizeApprovals(
  approvals: unknown[] | undefined,
): ApprovalDto[] | undefined {
  if (!approvals) return undefined;
  return approvals.flatMap((approval) => {
    const record = asRecord(approval);
    const approvalId = str(record.approvalId) ?? str(record.id);
    const toolName = str(record.toolName);
    const reason = str(record.reason);
    const createdAt = str(record.createdAt);
    const inputSummary = rec(record.inputSummary);
    if (!approvalId || !toolName || !reason || !createdAt || !inputSummary) {
      return [];
    }
    return [
      {
        approvalId,
        id: approvalId,
        status: "pending",
        toolName,
        reason,
        inputSummary,
        createdAt,
      },
    ];
  });
}

export function normalizeChatInternalResult(input: ChatInternalResult): ChatInternalResult {
  return {
    ...input,
    sources: input.sources ?? [],
    toolCalls: input.toolCalls ?? [],
    steps: input.steps ?? [],
  };
}
