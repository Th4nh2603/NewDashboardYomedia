import type { AuthenticatedUser } from "../auth/auth.types.js";
import { createDefaultToolRegistry } from "../../ai/tools/tool-registry.js";
import { ToolGateway } from "../../ai/tools/tool-gateway.js";
import type { AgentContext } from "../../ai/runtime/agent-context.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  hashApprovalArgs,
} from "./approval-crypto.js";
import { approvalRepository } from "./approval.repository.js";
import type { ApprovalPublicDto, ApprovalRecord } from "./approval.types.js";
import type {
  ApprovalExecuteInput,
  ApprovalListInput,
} from "./approval.service.types.js";
import { auditLogService } from "../audit-log/audit-log.service.js";

function nowIso(): string {
  return new Date().toISOString();
}

function isExpired(record: ApprovalRecord): boolean {
  return Date.parse(record.expiresAt) <= Date.now();
}

function toPublic(record: ApprovalRecord): ApprovalPublicDto {
  return {
    id: record.id,
    approvalId: record.id,
    status: record.status,
    toolName: record.toolName,
    reason: record.reason,
    inputSummary: record.requestedArgsSummary,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    riskLevel: record.riskLevel,
  };
}

function assertApprovalVisible(user: AuthenticatedUser, record: ApprovalRecord): void {
  if (record.tenantId !== user.tenantId) {
    throw new AppError("Approval request was not found.", 404);
  }
  if (record.brandId && !user.allowedBrandIds.includes(record.brandId)) {
    throw new AppError("Approval brand scope is not allowed.", 403);
  }
}

function buildExecutionContext(
  user: AuthenticatedUser,
  record: ApprovalRecord,
): AgentContext {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    permissions: user.permissions,
    allowedBrandIds: user.allowedBrandIds,
    allowedKnowledgeBaseIds: user.allowedKnowledgeBaseIds,
    allowedMcpTools: user.allowedMcpTools,
    allowedToolCapabilities: user.allowedToolCapabilities ?? user.allowedMcpTools,
    allowedBuildDemoBrands: user.allowedBuildDemoBrands,
    conversationId: `approval:${record.id}`,
    message: `Execute approved tool ${record.toolName}`,
    requestedBrandId: record.brandId,
  };
}

function resolveExecutionArgs(
  record: ApprovalRecord,
  suppliedArgs: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (suppliedArgs) {
    const suppliedHash = hashApprovalArgs(suppliedArgs);
    if (suppliedHash !== record.requestedArgsHash) {
      throw new AppError("Approval arguments do not match the approved request.", {
        statusCode: 409,
        code: "APPROVAL_ARGS_TAMPERED",
        expose: true,
      });
    }
    return suppliedArgs;
  }

  if (!record.executionArgsPersisted || !record.executionArgs) {
    throw new AppError("Approved arguments are not safely persisted for execution.", {
      statusCode: 409,
      code: "APPROVAL_ARGS_UNAVAILABLE",
      expose: true,
    });
  }
  return record.executionArgs;
}

export const approvalService = {
  async listPending(user: AuthenticatedUser, input: ApprovalListInput) {
    const status = input?.status ?? "pending";
    const limit = input?.limit ?? 50;
    const records = await approvalRepository.listByTenant(user.tenantId);
    return {
      approvals: records
        .filter((record) => record.status === status)
        .filter((record) => !record.brandId || user.allowedBrandIds.includes(record.brandId))
        .slice(0, limit)
        .map(toPublic),
    };
  },

  async approve(user: AuthenticatedUser, approvalId: string) {
    const existing = await approvalRepository.get(approvalId);
    if (!existing) throw new AppError("Approval request was not found.", 404);
    assertApprovalVisible(user, existing);
    if (isExpired(existing)) {
      const expired = await approvalRepository.update(approvalId, (record) => ({
        ...record,
        status: "expired",
        updatedAt: nowIso(),
      }));
      return { approval: toPublic(expired) };
    }
    if (existing.status !== "pending") {
      throw new AppError("Only pending approvals can be approved.", 409);
    }
    const updated = await approvalRepository.update(approvalId, (record) => ({
      ...record,
      status: "approved",
      approvedBy: user.id,
      approvedAt: nowIso(),
      updatedAt: nowIso(),
    }));
    await auditLogService.append({
      userId: user.id,
      tenantId: user.tenantId,
      brandId: updated.brandId,
      toolName: updated.toolName,
      actionType: "approval.approve",
      approvalId: updated.id,
      approvalStatus: updated.status,
      resultStatus: "approved",
      sanitizedInput: updated.requestedArgsSummary,
    });
    return { approval: toPublic(updated) };
  },

  async reject(user: AuthenticatedUser, approvalId: string) {
    const existing = await approvalRepository.get(approvalId);
    if (!existing) throw new AppError("Approval request was not found.", 404);
    assertApprovalVisible(user, existing);
    if (existing.status !== "pending") {
      throw new AppError("Only pending approvals can be rejected.", 409);
    }
    const updated = await approvalRepository.update(approvalId, (record) => ({
      ...record,
      status: "rejected",
      rejectedBy: user.id,
      rejectedAt: nowIso(),
      updatedAt: nowIso(),
    }));
    await auditLogService.append({
      userId: user.id,
      tenantId: user.tenantId,
      brandId: updated.brandId,
      toolName: updated.toolName,
      actionType: "approval.reject",
      approvalId: updated.id,
      approvalStatus: updated.status,
      resultStatus: "rejected",
      sanitizedInput: updated.requestedArgsSummary,
    });
    return { approval: toPublic(updated) };
  },

  async execute(user: AuthenticatedUser, input: ApprovalExecuteInput) {
    const existing = await approvalRepository.get(input.approvalId);
    if (!existing) throw new AppError("Approval request was not found.", 404);
    assertApprovalVisible(user, existing);
    if (isExpired(existing)) {
      await approvalRepository.update(input.approvalId, (record) => ({
        ...record,
        status: "expired",
        updatedAt: nowIso(),
      }));
      throw new AppError("Expired approvals cannot be executed.", 409);
    }
    if (existing.status !== "approved") {
      throw new AppError("Only approved pending execution requests can run.", 409);
    }

    const args = resolveExecutionArgs(existing, input.args);
    const context = buildExecutionContext(user, existing);
    const gateway = new ToolGateway(createDefaultToolRegistry());
    const result = await gateway.executeApproved(
      { name: existing.toolName, input: args },
      context,
    );

    const status = result.result.status === "success" ? "executed" : "failed";
    const updated = await approvalRepository.update(input.approvalId, (record) => ({
      ...record,
      status,
      executedAt: status === "executed" ? nowIso() : record.executedAt,
      executionResultStatus: result.result.status,
      executionError:
        result.result.status === "failed" ? result.result.summary : record.executionError,
      updatedAt: nowIso(),
    }));

    await auditLogService.append({
      userId: user.id,
      tenantId: user.tenantId,
      brandId: updated.brandId,
      sessionId: context.conversationId,
      toolName: updated.toolName,
      actionType: "approval.execute",
      approvalId: updated.id,
      approvalStatus: updated.status,
      policyDecision:
        result.result.status === "failed" ? "deny_or_execution_failed" : "allow",
      resultStatus: result.result.status,
      sanitizedInput: updated.requestedArgsSummary,
      sanitizedOutputSummary: result.result.summary,
      errorMessage: result.result.status === "failed" ? result.result.summary : undefined,
    });

    return {
      approval: toPublic(updated),
      toolCall: result.record,
      result: {
        status: result.result.status,
        summary: result.result.summary,
        data: result.result.data,
      },
    };
  },
};
