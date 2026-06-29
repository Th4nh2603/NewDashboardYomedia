import type { ApprovalStatus } from "../../ai/hitl/approval-state-machine.js";

export interface ApprovalRecord {
  id: string;
  userId: string;
  tenantId: string;
  brandId?: string;
  toolName: string;
  riskLevel: "low" | "medium" | "high";
  status: ApprovalStatus;
  reason: string;
  requestedArgsSummary: Record<string, unknown>;
  requestedArgsHash: string;
  policySnapshot: Record<string, unknown>;
  executionArgs?: Record<string, unknown>;
  executionArgsPersisted: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  executedAt?: string;
  executionResultStatus?: "success" | "failed" | "skipped" | "approval_required";
  executionError?: string;
}

export interface ApprovalPublicDto {
  id: string;
  approvalId: string;
  status: ApprovalStatus;
  toolName: string;
  reason: string;
  inputSummary: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
  riskLevel: "low" | "medium" | "high";
}
