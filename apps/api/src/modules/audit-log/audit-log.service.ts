import { sanitizeForLog } from "../../policy/safety-envelope.js";
import { logger } from "../../shared/logger/logger.js";
import { auditLogRepository } from "./audit-log.repository.js";
import type { AuditLogRecord } from "./audit-log.types.js";

export type AuditLogInput = Omit<AuditLogRecord, "id" | "createdAt">;

function safeErrorMessage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.length > 300 ? `${value.slice(0, 297)}...` : value;
}

export const auditLogService = {
  async append(input: AuditLogInput): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      ...input,
      id: crypto.randomUUID(),
      sanitizedInput: sanitizeForLog(input.sanitizedInput),
      sanitizedOutputSummary: safeErrorMessage(input.sanitizedOutputSummary),
      errorMessage: safeErrorMessage(input.errorMessage),
      createdAt: new Date().toISOString(),
    };
    const saved = await auditLogRepository.append(record);
    logger.info("[audit.persisted]", {
      event: "audit.persisted",
      tenantId: saved.tenantId,
      userId: saved.userId,
      toolName: saved.toolName,
      actionType: saved.actionType,
      approvalId: saved.approvalId,
      resultStatus: saved.resultStatus,
    });
    return saved;
  },

  listByTenant(tenantId: string): Promise<AuditLogRecord[]> {
    return auditLogRepository.listByTenant(tenantId);
  },
};
