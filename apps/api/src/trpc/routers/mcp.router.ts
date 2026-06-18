import { router, protectedProcedure } from "../trpc.js";

export const mcpRouter = router({
  listTools: protectedProcedure.query(() => []),
});
