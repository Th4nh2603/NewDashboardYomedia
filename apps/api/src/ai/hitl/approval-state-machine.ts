export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "executed"
  | "failed";

const transitions: Record<ApprovalStatus, ApprovalStatus[]> = {
  pending: ["approved", "rejected", "expired"],
  approved: ["executed", "failed", "expired"],
  rejected: [],
  expired: [],
  executed: [],
  failed: [],
};

export function canTransitionApproval(
  from: ApprovalStatus,
  to: ApprovalStatus,
): boolean {
  return transitions[from].includes(to);
}

export function transitionApproval(
  from: ApprovalStatus,
  to: ApprovalStatus,
): ApprovalStatus {
  if (!canTransitionApproval(from, to)) {
    throw new Error(`Invalid approval transition ${from} -> ${to}.`);
  }
  return to;
}
