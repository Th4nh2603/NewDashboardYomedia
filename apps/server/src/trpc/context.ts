import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request } from "express";
import {
  buildVerifiedAuth,
  type VerifiedAuth,
} from "../lib/auth/clerkAuth.js";
import {
  getBearerToken,
  isClerkAuthConfigured,
  verifyClerkBearerToken,
} from "../lib/auth/clerkVerify.js";
import { migrateLegacyRoleKey } from "../lib/auth/accounts.js";

export type TrpcContext = {
  req: Request;
  auth: VerifiedAuth | null;
};

function legacyRoleFromRequest(req: Request): string {
  const headerRole = req.header("x-user-role");
  if (typeof headerRole === "string" && headerRole.trim()) {
    return migrateLegacyRoleKey(headerRole);
  }
  const bodyRole =
    typeof req.body?.role === "string" ? String(req.body.role) : "";
  return migrateLegacyRoleKey(bodyRole || undefined);
}

export async function resolveAuth(req: Request): Promise<VerifiedAuth | null> {
  if (!isClerkAuthConfigured()) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) return null;
    const role = legacyRoleFromRequest(req);
    if (!role) return null;
    return { clerkUserId: "", email: "", role };
  }

  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const claims = await verifyClerkBearerToken(token);
    return await buildVerifiedAuth(claims.sub);
  } catch {
    return null;
  }
}

export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<TrpcContext> {
  const auth = await resolveAuth(req);
  return { req, auth };
}
