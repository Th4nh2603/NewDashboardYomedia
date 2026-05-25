import type { Request } from "express";
import { verifyToken } from "@clerk/backend";

export function getBearerToken(req: Request): string | null {
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

export function parseAuthorizedParties(): string[] | undefined {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (!raw) return undefined;
  const parts = raw
    .split(/[,|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export function isClerkAuthConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim());
}

export type ClerkTokenClaims = {
  sub: string;
  [key: string]: unknown;
};

export async function verifyClerkBearerToken(
  token: string,
): Promise<ClerkTokenClaims> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const jwtKey = process.env.CLERK_JWT_KEY?.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured on server");
  }

  const parties = parseAuthorizedParties();
  const verifyBase = {
    clockSkewInMs: 60_000,
    ...(parties?.length ? { authorizedParties: parties } : {}),
  };

  const claims = await verifyToken(token, {
    ...verifyBase,
    ...(jwtKey ? { jwtKey } : { secretKey }),
  });

  const sub = typeof claims?.sub === "string" ? claims.sub.trim() : "";
  if (!sub) {
    throw new Error("Invalid Clerk token payload: missing sub");
  }

  return { ...claims, sub } as ClerkTokenClaims;
}
