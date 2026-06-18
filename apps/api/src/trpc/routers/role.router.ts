import { router, protectedProcedure } from "../trpc.js";

export const roleRouter = router({
  list: protectedProcedure.query(() => []),
});
