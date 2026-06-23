import { TRPCError } from "@trpc/server";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { activityLogRepository } from "./activity-log.repository.js";
import type {
  ActivityLogAppendInput,
  ActivityLogListInput,
} from "./activity-log.schema.js";
import type {
  ActivityLogEntry,
  ActivityLogListResult,
  ActivityLogPublicEntry,
} from "./activity-log.types.js";

const MANAGER_TEAM_ROLES = new Set(["design", "media"]);
const UPLOAD_ACTIONS = new Set([
  "upload_folder",
  "save_test_data",
  "manage_demo_drop_upload_success",
  "manage_demo_drop_upload_partial",
  "upload_demo_success",
  "upload_demo_partial",
]);

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role.trim().toLowerCase() === "admin";
}

function isManager(user: AuthenticatedUser): boolean {
  return user.role.trim().toLowerCase() === "manager";
}

function publicEntry(entry: ActivityLogEntry): ActivityLogPublicEntry {
  const { tenantId: _tenantId, userId: _userId, ...rest } = entry;
  return rest;
}

function byScope(entry: ActivityLogEntry, scope: string | undefined): boolean {
  if (!scope) return true;
  const metadataScope = entry.metadata?.sftpScope;
  if (metadataScope === scope) return true;
  const target = entry.target.trim().toLowerCase();
  if (scope === "media") return target === "/media" || target.startsWith("/media/");
  return target === "/script/demo" || target.startsWith("/script/demo/");
}

export const activityLogService = {
  async append(
    user: AuthenticatedUser,
    input: ActivityLogAppendInput,
  ): Promise<{ ok: true; record: ActivityLogPublicEntry }> {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action: input.action,
      area: input.area,
      description: input.description,
      target: input.target,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    const record = await activityLogRepository.append(entry);
    return { ok: true, record: publicEntry(record) };
  },

  async list(
    user: AuthenticatedUser,
    input: ActivityLogListInput,
  ): Promise<ActivityLogListResult> {
    let records = (await activityLogRepository.list()).filter(
      (record) => record.tenantId === user.tenantId,
    );

    if (input.special === "manager-team") {
      if (!isManager(user) && !isAdmin(user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "FORBIDDEN" });
      }
      records = records.filter((record) =>
        MANAGER_TEAM_ROLES.has(record.userRole.trim().toLowerCase()),
      );
    } else if (input.special === "manage-demo-uploads") {
      if (!isAdmin(user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "FORBIDDEN" });
      }
      records = records.filter(
        (record) =>
          (record.area === "Manage Demo" || record.area === "Build Demo") &&
          (UPLOAD_ACTIONS.has(record.action) ||
            record.action.toLowerCase().includes("upload")),
      );
    } else if (input.email) {
      const requestedEmail = input.email.toLowerCase();
      if (!isAdmin(user) && requestedEmail !== user.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "FORBIDDEN" });
      }
      records = records.filter(
        (record) => record.userEmail.toLowerCase() === requestedEmail,
      );
    } else if (!isAdmin(user)) {
      records = records.filter(
        (record) => record.userEmail.toLowerCase() === user.email.toLowerCase(),
      );
    }

    records = records.filter((record) => byScope(record, input.scope));
    const total = records.length;
    return {
      records: records.slice(0, input.limit).map(publicEntry),
      total,
    };
  },

  async clear(user: AuthenticatedUser): Promise<{ ok: true; deleted: number }> {
    if (!isAdmin(user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "FORBIDDEN" });
    }
    const deleted = await activityLogRepository.clearTenant(user.tenantId);
    return { ok: true, deleted };
  },
};
