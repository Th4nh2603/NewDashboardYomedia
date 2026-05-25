import { Router, Request, Response } from "express";
import { createClerkClient } from "@clerk/backend";
import {
  getBearerToken,
  isClerkAuthConfigured,
  verifyClerkBearerToken,
} from "../lib/auth/clerkVerify.js";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  try {
    const isDev = process.env.NODE_ENV !== "production";

    if (!isClerkAuthConfigured()) {
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

    let claims;
    try {
      claims = await verifyClerkBearerToken(token);
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

    const userId = claims.sub;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "Invalid Clerk token payload",
      });
    }

    const secretKey = process.env.CLERK_SECRET_KEY!.trim();
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
