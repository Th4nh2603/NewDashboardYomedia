import { sanitizeForLog } from "../policy/safety-envelope.js";
import { auditLogService } from "../modules/audit-log/audit-log.service.js";
import { logger } from "../shared/logger/logger.js";

export async function auditToolEvent(event: {
  userId: string;
  tenantId: string;
  brandId?: string;
  sessionId?: string;
  requestId?: string;
  agentName?: string;
  toolName: string;
  approvalStatus?: string;
  approvalId?: string;
  policyDecision?: string;
  resultStatus: string;
  actionType?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  logger.info("[audit.tool]", {
    event: "audit.tool",
    userId: event.userId,
    tenantId: event.tenantId,
    toolName: event.toolName,
    approvalStatus: event.approvalStatus,
    resultStatus: event.resultStatus,
    metadata: sanitizeForLog(event.metadata),
  });
  await auditLogService.append({
    userId: event.userId,
    tenantId: event.tenantId,
    brandId: event.brandId,
    sessionId: event.sessionId,
    requestId: event.requestId,
    agentName: event.agentName,
    toolName: event.toolName,
    actionType: event.actionType ?? "tool",
    approvalId: event.approvalId,
    approvalStatus: event.approvalStatus,
    policyDecision: event.policyDecision,
    resultStatus: event.resultStatus,
    sanitizedInput: event.metadata,
  });
}
