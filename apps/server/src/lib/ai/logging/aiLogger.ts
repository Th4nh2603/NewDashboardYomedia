import { appendActivityLog } from "../../../modules/activity/services/activityLog.js";
import { logBestEffort } from "../../logBestEffort.js";

export function logChatFlowStep(
  requestId: string | undefined,
  step: string,
  metadata?: Record<string, unknown>,
): void {
  const id = requestId || "no-request-id";
  console.info(`[chat-flow][${id}][${step}]`, metadata ?? {});
}

export function logChatFlowError(
  requestId: string | undefined,
  step: string,
  err: unknown,
  metadata?: Record<string, unknown>,
): void {
  const id = requestId || "no-request-id";
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[chat-flow][${id}][${step}][error]`, {
    message,
    ...(metadata ?? {}),
  });
}

export async function logChatEvent(input: {
  action: string;
  description: string;
  role: string;
  email?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await appendActivityLog({
      userName: input.email || "unknown",
      userEmail: input.email || "",
      userRole: input.role,
      action: input.action,
      area: "Chat",
      description: input.description,
      target: "rag.query",
      metadata: input.metadata,
    });
  } catch (err) {
    logBestEffort("ai.activityLog", err, { action: input.action });
  }
}
