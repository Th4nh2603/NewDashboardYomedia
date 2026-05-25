import { z } from "zod";
import { getVerifiedEmail } from "../../lib/auth/clerkAuth.js";
import { HttpError } from "../../lib/http/errors.js";
import {
  getAccountProfile,
  loginWithEmailPassword,
  resolveSessionUser,
} from "../../services/auth.js";
import { normalizeAccountText } from "../../lib/auth/accounts.js";
import {
  protectedProcedure,
  publicProcedure,
  router,
  runHandler,
} from "../trpc.js";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(({ input }) => {
      const result = loginWithEmailPassword(input.email, input.password);
      if (!result.ok) {
        throw new HttpError(401, result.error);
      }
      return result;
    }),

  me: protectedProcedure
    .input(
      z
        .object({
          name: z.string().optional(),
        })
        .optional(),
    )
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        const email = getVerifiedEmail(ctx.req);
        const result = resolveSessionUser(email, input?.name);
        if (!result.ok && "error" in result) {
          throw new HttpError(400, result.error);
        }
        return result;
      }),
    ),

  roleRoutes: protectedProcedure
    .input(
      z
        .object({
          name: z.string().optional(),
        })
        .optional(),
    )
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        const email = getVerifiedEmail(ctx.req);
        const result = resolveSessionUser(email, input?.name);
        if (!result.ok && "error" in result) {
          throw new HttpError(400, result.error);
        }
        return result;
      }),
    ),

  accountProfile: publicProcedure
    .input(z.object({ email: z.string().email().or(z.string().min(1)) }))
    .query(({ input }) => {
      const result = getAccountProfile(input.email);
      if (!result.ok) {
        const status = result.error === "Account not found" ? 404 : 400;
        throw new HttpError(status, result.error);
      }
      return result;
    }),
});
