import { createClerkClient } from "@clerk/backend";
import {
  getBearerToken,
  isClerkAuthConfigured,
  verifyClerkBearerToken,
} from "../lib/clerkVerify.js";
import { publicProcedure, router, runHandler } from "../../../trpc/trpc.js";

export const userRouter = router({
  me: publicProcedure.query(({ ctx }) =>
    runHandler(async () => {
      const isDev = process.env.NODE_ENV !== "production";

      if (!isClerkAuthConfigured()) {
        return {
          ok: false as const,
          error:
            "CLERK_SECRET_KEY is not configured on server; using client-side Clerk fallback",
        };
      }

      const token = getBearerToken(ctx.req);
      if (!token) {
        return {
          ok: false as const,
          authenticated: false as const,
          user: null,
          error: "Missing or invalid Authorization Bearer token",
        };
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
        return {
          ok: false as const,
          authenticated: false as const,
          user: null,
          error: "Unauthorized: invalid or expired Clerk token",
          ...(isDev ? { detail: msg } : {}),
        };
      }

      const userId = claims.sub;
      if (!userId) {
        return {
          ok: false as const,
          authenticated: false as const,
          user: null,
          error: "Invalid Clerk token payload",
        };
      }

      const secretKey = process.env.CLERK_SECRET_KEY!.trim();
      const clerkClient = createClerkClient({ secretKey });
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      return {
        ok: true as const,
        authenticated: true as const,
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
      };
    }),
  ),
});
