import type { NextFunction, Request, Response } from "express";
import { createClerkClient } from "@clerk/backend";
import {
  findAccountById,
  migrateLegacyRoleKey,
  normalizeAccountText,
  type Account,
} from "./accounts.js";
import {
  getBearerToken,
  isClerkAuthConfigured,
  verifyClerkBearerToken,
} from "./clerkVerify.js";

let clerkClientSingleton: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) return null;
  if (!clerkClientSingleton) {
    clerkClientSingleton = createClerkClient({ secretKey });
  }
  return clerkClientSingleton;
}

async function fetchClerkPrimaryEmail(clerkUserId: string): Promise<string> {
  const client = getClerkClient();
  if (!client) return "";
  try {
    const clerkUser = await client.users.getUser(clerkUserId);
    const primary = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );
    return primary?.emailAddress?.trim() || "";
  } catch {
    return "";
  }
}

export type VerifiedAuth = {
  clerkUserId: string;
  email: string;
  role: string;
  account?: Account;
};

export async function buildVerifiedAuth(
  clerkUserId: string,
): Promise<VerifiedAuth> {
  const account = findAccountById(clerkUserId);
  if (account) {
    return {
      clerkUserId,
      email: account.email?.trim() || "",
      role: migrateLegacyRoleKey(account.role),
      account,
    };
  }

  const email = await fetchClerkPrimaryEmail(clerkUserId);
  return {
    clerkUserId,
    email,
    role: "guest",
  };
}

function legacyRoleFromRequest(req: Request): string {
  const headerRole = req.header("x-user-role");
  if (typeof headerRole === "string" && headerRole.trim()) {
    return migrateLegacyRoleKey(headerRole);
  }
  const bodyRole =
    typeof req.body?.role === "string" ? String(req.body.role) : "";
  return migrateLegacyRoleKey(bodyRole || undefined);
}

/**
 * Requires a valid Clerk Bearer JWT when CLERK_SECRET_KEY is set.
 * Resolves role from `accounts.json` by Clerk user id (not from `x-user-role`).
 * In development without Clerk secret, falls back to `x-user-role` with a warning.
 */
export async function requireClerkAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isClerkAuthConfigured()) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      res.status(500).json({
        ok: false,
        error: "CLERK_SECRET_KEY is required in production",
        code: "AUTH_NOT_CONFIGURED",
      });
      return;
    }
    const role = legacyRoleFromRequest(req);
    if (!role) {
      res.status(401).json({
        ok: false,
        error:
          "Unauthorized: sign in with Clerk or send x-user-role (dev only, CLERK_SECRET_KEY unset)",
        code: "UNAUTHORIZED",
      });
      return;
    }
    console.warn(
      "[auth] CLERK_SECRET_KEY unset — using x-user-role for",
      req.method,
      req.path,
    );
    req.verifiedAuth = {
      clerkUserId: "",
      email: "",
      role,
    };
    next();
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      error: "Missing or invalid Authorization Bearer token",
      code: "UNAUTHORIZED",
    });
    return;
  }

  try {
    const claims = await verifyClerkBearerToken(token);
    req.verifiedAuth = await buildVerifiedAuth(claims.sub);
    next();
  } catch (verifyErr) {
    const msg =
      verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      console.error("[Clerk] verifyToken failed:", msg);
    }
    res.status(401).json({
      ok: false,
      error: "Unauthorized: invalid or expired Clerk token",
      code: "UNAUTHORIZED",
      ...(isDev ? { detail: msg } : {}),
    });
  }
}

/** Email on the verified session (for handlers that must not trust body/query email). */
export function getVerifiedEmail(req: Request): string {
  const fromAccount = req.verifiedAuth?.account?.email?.trim();
  if (fromAccount) return fromAccount;
  return req.verifiedAuth?.email?.trim() || "";
}

export function emailsMatchVerified(
  req: Request,
  email: string | undefined,
): boolean {
  const verified = normalizeAccountText(getVerifiedEmail(req));
  const candidate = normalizeAccountText(email);
  if (!verified || !candidate) return false;
  return verified === candidate;
}
