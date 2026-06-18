import { z } from "zod";

export const ACCOUNT_ROLES = [
  "admin",
  "manager",
  "design",
  "media",
  "guest",
] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const adminAccountRowSchema = z.object({
  role: z.enum(ACCOUNT_ROLES, { message: "Invalid role" }),
  roleTitle: z
    .string()
    .trim()
    .max(120, "Role title is too long"),
  status: z.enum(ACCOUNT_STATUSES, { message: "Invalid status" }),
});

export type AdminAccountRowFormValues = z.infer<typeof adminAccountRowSchema>;

export function accountToRowFormValues(account: {
  role: string;
  roleTitle?: string | null;
  status?: string | null;
}): AdminAccountRowFormValues {
  const role = ACCOUNT_ROLES.includes(account.role as AccountRole)
    ? (account.role as AccountRole)
    : "guest";
  const status =
    account.status === "inactive" ? "inactive" : ("active" as AccountStatus);
  return {
    role,
    roleTitle: String(account.roleTitle ?? "").trim(),
    status,
  };
}
