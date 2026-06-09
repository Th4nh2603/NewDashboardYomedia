import { appendActivityLog } from "../../../services/activity/activityLog.js";
import { logBestEffort } from "../../logBestEffort.js";

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
