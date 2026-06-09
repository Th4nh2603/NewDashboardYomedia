import { createClerkClient } from "@clerk/backend";
import { z } from "zod";
import { HttpError } from "../../lib/http/errors.js";
import {
  getBearerToken,
  isClerkAuthConfigured,
  verifyClerkBearerToken,
} from "../../lib/auth/clerkVerify.js";
import { protectedProcedure, publicProcedure, router, runHandler } from "../../trpc/trpc.js";

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
        throw new HttpError(401, "Missing or invalid Authorization Bearer token");
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
        throw new HttpError(401, "Unauthorized: invalid or expired Clerk token", {
          code: "UNAUTHORIZED",
          ...(isDev ? { details: { detail: msg } } : {}),
        });
      }

      const userId = claims.sub;
      if (!userId) {
        throw new HttpError(401, "Invalid Clerk token payload");
      }

      const secretKey = process.env.CLERK_SECRET_KEY!.trim();
      const clerkClient = createClerkClient({ secretKey });
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      );

      return {
        ok: true as const,
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
