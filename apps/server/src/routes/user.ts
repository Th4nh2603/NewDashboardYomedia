import { Router, Request, Response } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";

const router = Router();

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

router.get("/me", async (req: Request, res: Response) => {
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing CLERK_SECRET_KEY on server",
      });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing or invalid Authorization Bearer token",
      });
    }

    const claims = await verifyToken(token, { secretKey });
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
    return res.status(401).json({
      ok: false,
      error: "Unauthorized: invalid or expired Clerk token",
    });
  }
});

export const userRouter = router;
