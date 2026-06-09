import { z } from "zod";
import {
  listActiveCreativeDemos,
  listCreativeDemoTitles,
} from "../../services/creative/creative.js";
import { publicProcedure, router } from "../../trpc/trpc.js";

export const creativeRouter = router({
  demos: publicProcedure.query(() => ({
    ok: true as const,
    demos: listActiveCreativeDemos(),
  })),

  demoTitles: publicProcedure
    .input(
      z
        .object({
          activeOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(({ input }) => ({
      ok: true as const,
      items: listCreativeDemoTitles(input?.activeOnly === true),
    })),
});
