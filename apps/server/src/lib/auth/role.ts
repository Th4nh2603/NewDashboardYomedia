import type { Request } from "express";

/** Role from verified Clerk session when present; otherwise legacy client header/body. */
export function getUserRole(req: Request): string {
  const verified = req.verifiedAuth?.role?.trim().toLowerCase();
  if (verified) return verified;

  const headerRole = req.header("x-user-role");
  if (typeof headerRole === "string" && headerRole.trim()) {
    return headerRole.trim().toLowerCase();
  }

  const bodyRole =
    typeof req.body?.role === "string" ? String(req.body.role) : "";
  return bodyRole.trim().toLowerCase();
}
