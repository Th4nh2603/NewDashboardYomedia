import { publicProcedure, router } from "../../trpc/trpc.js";

export const healthRouter = router({
  check: publicProcedure.query(() => ({ ok: true as const })),
});
