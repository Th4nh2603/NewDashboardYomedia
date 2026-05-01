import { Router, Request, Response } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";

const router = Router();

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

function parseAuthorizedParties(): string[] | undefined {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (!raw) return undefined;
  const parts = raw
    .split(/[,|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

router.get("/me", async (req: Request, res: Response) => {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY?.trim();
    const jwtKey = process.env.CLERK_JWT_KEY?.trim();
    const isDev = process.env.NODE_ENV !== "production";

    if (!secretKey) {
      return res.json({
        ok: false,
        error:
          "CLERK_SECRET_KEY is not configured on server; using client-side Clerk fallback",
      });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing or invalid Authorization Bearer token",
      });
    }

    const parties = parseAuthorizedParties();
    const verifyBase = {
      clockSkewInMs: 60_000,
      ...(parties?.length ? { authorizedParties: parties } : {}),
    };

    let claims;
    try {
      claims = await verifyToken(token, {
        ...verifyBase,
        ...(jwtKey ? { jwtKey } : { secretKey }),
      });
    } catch (verifyErr) {
      const msg =
        verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
      if (isDev) {
        console.error("[Clerk] verifyToken failed:", msg);
      }
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: invalid or expired Clerk token",
        ...(isDev ? { detail: msg } : {}),
      });
    }

    const userId = claims?.sub;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "Invalid Clerk token payload",
      });
    }

    const clerkClient = createClerkClient({ secretKey });
    const clerkUser = await clerkClient.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );

    return res.json({
      ok: true,
      user: {
        id: clerkUser.id,
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          clerkUser.username ||
          "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        username: clerkUser.username,
        email: primaryEmail?.emailAddress || "",
        imageUrl: clerkUser.imageUrl,
      },
    });
  } catch (error) {
    console.error("Failed to fetch Clerk user", error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(401).json({
      ok: false,
      error: "Unauthorized: invalid or expired Clerk token",
      ...(process.env.NODE_ENV !== "production" ? { detail: msg } : {}),
    });
  }
});

export const userRouter = router;
