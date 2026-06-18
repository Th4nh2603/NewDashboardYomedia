import { router, protectedProcedure } from "../trpc.js";

export const userRouter = router({
  me: protectedProcedure.query(({ ctx }) => ({
    ok: true as const,
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      username: ctx.user.username,
      email: ctx.user.email,
      imageUrl: ctx.user.imageUrl,
    },
  })),
});
