import { createClerkClient } from "@clerk/backend";
import {
  loadAccounts,
  migrateLegacyRoleKey,
  normalizeAccountText,
  saveAccounts,
  type Account,
} from "../../lib/auth/accounts.js";
import { normalizeBuildDemoBrandIds } from "../../repositories/brand.repository.js";
import {
  mapClerkUserToAdminAccount,
  roleTitleFromRole,
  updateLocalAccountById,
  upsertLocalAccountFromClerkUser,
} from "../auth/permissions.js";

function getClerkApiFirstErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const errors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0];
  if (typeof first !== "object" || first === null) return undefined;
  const msg = (first as { message?: unknown }).message;
  return msg == null ? undefined : String(msg);
}

type ClerkFail = { ok: false; error: string };
type ClerkOk = { ok: true; client: ReturnType<typeof createClerkClient> };

function getClerkClientOrThrow(): ClerkFail | ClerkOk {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    return {
      ok: false,
      error: "Missing CLERK_SECRET_KEY on server",
    };
  }
  return { ok: true, client: createClerkClient({ secretKey }) };
}

export async function listAdminAccounts(): Promise<
  | ClerkFail
  | { ok: true; accounts: ReturnType<typeof mapClerkUserToAdminAccount>[] }
  | { ok: false; error: string }
> {
  const clerk = getClerkClientOrThrow();
  if (!clerk.ok) return clerk;

  try {
    const response = await clerk.client.users.getUserList({ limit: 500 });
    const users = Array.isArray((response as { data?: unknown }).data)
      ? (response as { data: unknown[] }).data
      : Array.isArray(response)
        ? response
        : [];

    const localAccountsByEmail = new Map(
      loadAccounts().map((account) => [
        normalizeAccountText(account.email),
        account,
      ]),
    );

    return {
      ok: true as const,
      accounts: users.map((clerkUser: unknown) => {
        const u = clerkUser as {
          emailAddresses?: { id: string; emailAddress?: string }[];
          primaryEmailAddressId?: string;
        };
        const primaryEmailObj = u.emailAddresses?.find(
          (email) => email.id === u.primaryEmailAddressId,
        );
        const emailKey = normalizeAccountText(primaryEmailObj?.emailAddress);
        const localAccount = localAccountsByEmail.get(emailKey);
        return mapClerkUserToAdminAccount(clerkUser, localAccount);
      }),
    };
  } catch (error) {
    console.error("Failed to fetch admin accounts from Clerk", error);
    const clerkMsg =
      getClerkApiFirstErrorMessage(error) ||
      (error instanceof Error ? error.message : "");
    return {
      ok: false as const,
      error: clerkMsg
        ? `Unable to fetch users from Clerk (${clerkMsg})`
        : "Unable to fetch users from Clerk",
    };
  }
}

export async function updateAdminAccount(
  id: string,
  payload: {
    role?: string;
    roleTitle?: string;
    status?: string;
    allowedBuildDemoBrands?: unknown;
  },
): Promise<
  | ClerkFail
  | { ok: false; error: string }
  | { ok: true; user: ReturnType<typeof mapClerkUserToAdminAccount> }
> {
  const clerk = getClerkClientOrThrow();
  if (!clerk.ok) return clerk;

  const updates: Partial<Account> = {};

  if (typeof payload.role === "string") {
    updates.role = migrateLegacyRoleKey(payload.role);
  }
  if (typeof payload.roleTitle === "string") {
    updates.roleTitle = payload.roleTitle.trim();
  }
  if (typeof payload.status === "string") {
    updates.status = payload.status.trim().toLowerCase();
  }
  if (payload.allowedBuildDemoBrands !== undefined) {
    const existing = loadAccounts().find((account) => account.id === id);
    const effectiveRole = normalizeAccountText(updates.role ?? existing?.role);
    if (effectiveRole === "admin") {
      updates.allowedBuildDemoBrands = null;
    } else if (payload.allowedBuildDemoBrands === null) {
      updates.allowedBuildDemoBrands = null;
    } else {
      updates.allowedBuildDemoBrands = normalizeBuildDemoBrandIds(
        payload.allowedBuildDemoBrands,
      );
    }
  }

  const hasRole = typeof payload.role === "string";
  const hasRoleTitle = typeof payload.roleTitle === "string";
  const hasStatus = typeof payload.status === "string";
  const hasBrands = payload.allowedBuildDemoBrands !== undefined;

  if (!hasRole && !hasRoleTitle && !hasStatus && !hasBrands) {
    return { ok: false as const, error: "No valid update fields" };
  }

  try {
    const currentUser = await clerk.client.users.getUser(id);
    const currentMetadata = (currentUser.publicMetadata || {}) as Record<
      string,
      unknown
    >;

    const nextPublicMetadata: Record<string, unknown> = {
      ...currentMetadata,
    };
    if (updates.role) {
      nextPublicMetadata.role = updates.role;
    }
    if (updates.roleTitle) {
      nextPublicMetadata.roleTitle = updates.roleTitle;
    } else if (updates.role) {
      nextPublicMetadata.roleTitle = roleTitleFromRole(updates.role);
    }
    if (updates.status) {
      nextPublicMetadata.status = updates.status;
    }
    if (updates.allowedBuildDemoBrands !== undefined) {
      nextPublicMetadata.allowedBuildDemoBrands = updates.allowedBuildDemoBrands;
    }

    const updatedUser = await clerk.client.users.updateUserMetadata(id, {
      publicMetadata: nextPublicMetadata,
    });

    upsertLocalAccountFromClerkUser(updatedUser);
    if (updates.allowedBuildDemoBrands !== undefined) {
      updateLocalAccountById(id, {
        allowedBuildDemoBrands: updates.allowedBuildDemoBrands,
      });
    }

    const localAccount = loadAccounts().find((account) => account.id === id);

    return {
      ok: true as const,
      user: mapClerkUserToAdminAccount(updatedUser, localAccount),
    };
  } catch (error) {
    console.error(`Failed to update Clerk user ${id}`, error);
    return { ok: false as const, error: "Unable to update user" };
  }
}
