import { z } from "zod";
import { getUserRole } from "../../auth/lib/role.js";
import {
  appendActivityLog,
  clearActivityLogs,
  listActivityLogs,
} from "../services/activityLog.js";
import { protectedProcedure, router, runHandler } from "../../../trpc/trpc.js";

export const activityLogRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          email: z.string().optional(),
          special: z.string().optional(),
          scope: z.string().optional(),
          limit: z.number().int().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      runHandler(() =>
        listActivityLogs({
          role: getUserRole(ctx.req),
          email: input?.email,
          special: input?.special,
          scope: input?.scope,
          limit: input?.limit,
        }),
      ),
    ),

  append: protectedProcedure
    .input(
      z.object({
        userName: z.unknown().optional(),
        userEmail: z.unknown().optional(),
        userRole: z.unknown().optional(),
        action: z.unknown().optional(),
        area: z.unknown().optional(),
        description: z.unknown().optional(),
        target: z.unknown().optional(),
        metadata: z.unknown().optional(),
        createdAt: z.unknown().optional(),
      }),
    )
    .mutation(({ input }) => runHandler(() => appendActivityLog(input))),

  clear: protectedProcedure.mutation(({ ctx }) =>
    runHandler(() => clearActivityLogs(getUserRole(ctx.req))),
  ),
});
