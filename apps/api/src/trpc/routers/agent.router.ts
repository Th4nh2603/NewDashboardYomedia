import { router, protectedProcedure } from "../trpc.js";

export const agentRouter = router({
  traces: protectedProcedure.query(() => []),
});
