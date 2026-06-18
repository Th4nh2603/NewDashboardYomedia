import { router, protectedProcedure } from "../trpc.js";

export const campaignRouter = router({
  list: protectedProcedure.query(() => []),
});
