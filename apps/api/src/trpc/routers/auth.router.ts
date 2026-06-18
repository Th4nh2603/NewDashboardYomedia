import { z } from "zod";
import { buildAuthMeResult } from "../../modules/auth/auth.service.js";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";

const authMeInput = z
  .object({
    name: z.string().optional(),
  })
  .optional();

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => ({
    user: ctx.user,
  })),
  me: protectedProcedure
    .input(authMeInput)
    .mutation(({ ctx, input }) => buildAuthMeResult(ctx.user, input?.name)),
  roleRoutes: protectedProcedure
    .input(authMeInput)
    .mutation(({ ctx, input }) => buildAuthMeResult(ctx.user, input?.name)),
});
