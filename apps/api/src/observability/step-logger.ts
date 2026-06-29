import { sanitizeForLog } from "../policy/safety-envelope.js";
import { logger } from "../shared/logger/logger.js";

export interface StepLogMeta {
  conversationId: string;
  messageId: string;
  requestId?: string;
}

function asRecord(step: unknown): Record<string, unknown> {
  return typeof step === "object" && step !== null
    ? (step as Record<string, unknown>)
    : {};
}

function truncate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > 240 ? `${value.slice(0, 237)}...` : value;
}

function stepName(step: Record<string, unknown>): string {
  if (typeof step.name === "string") return step.name;
  const agent = typeof step.agent === "string" ? step.agent : undefined;
  const action = typeof step.action === "string" ? step.action : undefined;
  if (agent && action) return `${agent}.${action}`;
  return agent ?? "chat.step";
}

export function logStep(meta: StepLogMeta, step: unknown, stepIndex: number): void {
  const record = asRecord(step);
  logger.info("[chat.flow.step]", {
    event: "chat.flow.step",
    requestId: meta.requestId,
    conversationId: meta.conversationId,
    messageId: meta.messageId,
    stepIndex,
    stepName: stepName(record),
    status: typeof record.status === "string" ? record.status : undefined,
    summary: truncate(record.summary),
    durationMs: typeof record.durationMs === "number" ? record.durationMs : undefined,
    data: sanitizeForLog(record.data),
  });
}

export function logSteps(meta: StepLogMeta, steps: unknown[]): void {
  steps.forEach((step, index) => logStep(meta, step, index + 1));
}
