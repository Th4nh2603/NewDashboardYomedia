import type { Request } from "express";

export function getUserRole(req: Request): string {
  const headerRole = req.header("x-user-role");
  if (typeof headerRole === "string" && headerRole.trim()) {
    return headerRole.trim().toLowerCase();
  }

  const bodyRole =
    typeof req.body?.role === "string" ? String(req.body.role) : "";
  return bodyRole.trim().toLowerCase();
}
