import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request } from "express";
import {
  isClerkAuthConfigured,
  resolveAuthenticatedUser,
} from "../modules/auth/auth.service.js";
import type { AuthenticatedUser } from "../modules/auth/auth.types.js";

export interface Context {
  req: Request;
  authError?: string;
  requestId?: string;
  user: AuthenticatedUser | null;
}

function getBearerToken(req: Request): string | null {
  const authHeader =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : null;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function createContext({
  req,
}: CreateExpressContextOptions): Promise<Context> {
  const token = getBearerToken(req);
  let authError: string | undefined;
  let user: AuthenticatedUser | null = null;

  if (!isClerkAuthConfigured()) {
    authError = "CLERK_SECRET_KEY is not configured on the API server";
  } else if (!token) {
    authError = "Missing Authorization Bearer token";
  } else {
    try {
      user = await resolveAuthenticatedUser(token);
    } catch {
      authError = "Invalid or expired Clerk token";
    }
  }

  return {
    req,
    authError,
    requestId: req.headers["x-request-id"]?.toString(),
    user,
  };
}
