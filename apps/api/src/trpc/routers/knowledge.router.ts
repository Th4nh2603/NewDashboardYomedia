import { router, protectedProcedure } from "../trpc.js";

export const knowledgeRouter = router({
  list: protectedProcedure.query(() => []),
});
