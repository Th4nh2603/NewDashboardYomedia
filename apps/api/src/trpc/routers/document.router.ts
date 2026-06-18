import { router, protectedProcedure } from "../trpc.js";

export const documentRouter = router({
  list: protectedProcedure.query(() => []),
});
