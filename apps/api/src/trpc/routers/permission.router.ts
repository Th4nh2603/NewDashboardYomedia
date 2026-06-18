import { router, protectedProcedure } from "../trpc.js";

export const permissionRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.user.permissions),
});
