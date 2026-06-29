export interface AuditLogRecord {
  id: string;
  userId: string;
  tenantId: string;
  brandId?: string;
  sessionId?: string;
  requestId?: string;
  agentName?: string;
  toolName?: string;
  actionType: string;
  approvalId?: string;
  approvalStatus?: string;
  policyDecision?: string;
  resultStatus: string;
  sanitizedInput?: unknown;
  sanitizedOutputSummary?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}
