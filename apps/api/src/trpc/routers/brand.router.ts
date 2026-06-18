import { router, protectedProcedure } from "../trpc.js";

export const brandRouter = router({
  listAllowed: protectedProcedure.query(({ ctx }) => ctx.user.allowedBrandIds),
});
