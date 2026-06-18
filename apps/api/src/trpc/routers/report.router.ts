import { router, protectedProcedure } from "../trpc.js";

export const reportRouter = router({
  list: protectedProcedure.query(() => []),
});
