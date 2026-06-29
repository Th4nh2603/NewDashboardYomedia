import type { ApprovalRequiredDto } from "./approval-handler.js";
import type { ApprovalStatus } from "./approval-state-machine.js";
import { transitionApproval } from "./approval-state-machine.js";

export interface StoredApproval extends Omit<ApprovalRequiredDto, "status"> {
  status: ApprovalStatus;
  expiresAt: string;
}

export class InMemoryApprovalStore {
  private readonly approvals = new Map<string, StoredApproval>();

  create(approval: ApprovalRequiredDto, ttlMs = 10 * 60 * 1000): StoredApproval {
    const stored: StoredApproval = {
      ...approval,
      status: "pending",
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
    this.approvals.set(stored.id, stored);
    return stored;
  }

  get(id: string): StoredApproval | undefined {
    return this.approvals.get(id);
  }

  updateStatus(id: string, status: ApprovalStatus): StoredApproval {
    const existing = this.approvals.get(id);
    if (!existing) throw new Error("Approval request was not found.");
    const updated = {
      ...existing,
      status: transitionApproval(existing.status, status),
    };
    this.approvals.set(id, updated);
    return updated;
  }
}
