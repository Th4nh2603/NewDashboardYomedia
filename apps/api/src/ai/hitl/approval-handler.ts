import type { AgentContext } from "../runtime/agent-context.js";
import { summarizeForApproval } from "../../policy/safety-envelope.js";
import {
  hashApprovalArgs,
  persistableApprovalArgs,
} from "../../modules/approval/approval-crypto.js";
import { approvalRepository } from "../../modules/approval/approval.repository.js";
import type { ApprovalRecord } from "../../modules/approval/approval.types.js";
import { auditLogService } from "../../modules/audit-log/audit-log.service.js";

export interface ApprovalRequest {
  toolName: string;
  reason: string;
  input: Record<string, unknown>;
  context: AgentContext;
  riskLevel?: "low" | "medium" | "high";
  policySnapshot?: Record<string, unknown>;
}

export interface ApprovalRequiredDto {
  approvalId: string;
  id: string;
  status: "pending";
  toolName: string;
  reason: string;
  inputSummary: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
  riskLevel?: "low" | "medium" | "high";
}

export interface ApprovalHandler {
  requestApproval(request: ApprovalRequest): Promise<ApprovalRequiredDto>;
}

export class DurableApprovalHandler implements ApprovalHandler {
  async requestApproval(
    request: ApprovalRequest,
  ): Promise<ApprovalRequiredDto> {
    const approvalId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const executionArgs = persistableApprovalArgs(request.input);
    const record: ApprovalRecord = {
      id: approvalId,
      userId: request.context.userId,
      tenantId: request.context.tenantId,
      brandId: request.context.requestedBrandId,
      toolName: request.toolName,
      riskLevel: request.riskLevel ?? "high",
      status: "pending",
      reason: request.reason,
      requestedArgsSummary: summarizeForApproval(request.input),
      requestedArgsHash: hashApprovalArgs(request.input),
      policySnapshot: request.policySnapshot ?? {
        permissions: request.context.permissions,
        allowedToolCapabilities:
          request.context.allowedToolCapabilities ?? request.context.allowedMcpTools,
        requestedBrandId: request.context.requestedBrandId,
        requestedKnowledgeBaseId: request.context.requestedKnowledgeBaseId,
      },
      executionArgs,
      executionArgsPersisted: executionArgs !== undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
    };
    const saved = await approvalRepository.create(record);
    await auditLogService.append({
      userId: saved.userId,
      tenantId: saved.tenantId,
      brandId: saved.brandId,
      sessionId: request.context.conversationId,
      requestId: request.context.requestId,
      toolName: saved.toolName,
      actionType: "approval.create",
      approvalId: saved.id,
      approvalStatus: saved.status,
      policyDecision: "requiresApproval",
      resultStatus: "pending",
      sanitizedInput: saved.requestedArgsSummary,
    });
    return {
      approvalId: saved.id,
      id: saved.id,
      status: "pending",
      toolName: saved.toolName,
      reason: saved.reason,
      inputSummary: saved.requestedArgsSummary,
      createdAt: saved.createdAt,
      expiresAt: saved.expiresAt,
      riskLevel: saved.riskLevel,
    };
  }
}

export class PlaceholderApprovalHandler extends DurableApprovalHandler {}
