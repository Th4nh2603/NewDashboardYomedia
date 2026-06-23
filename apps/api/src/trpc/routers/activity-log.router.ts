import { router, protectedProcedure } from "../trpc.js";
import {
  activityLogAppendInputSchema,
  activityLogListInputSchema,
} from "../../modules/activity-log/activity-log.schema.js";
import { activityLogService } from "../../modules/activity-log/activity-log.service.js";

export const activityLogRouter = router({
  list: protectedProcedure
    .input(activityLogListInputSchema)
    .query(({ ctx, input }) => activityLogService.list(ctx.user, input)),
  append: protectedProcedure
    .input(activityLogAppendInputSchema)
    .mutation(({ ctx, input }) => activityLogService.append(ctx.user, input)),
  clear: protectedProcedure.mutation(({ ctx }) =>
    activityLogService.clear(ctx.user),
  ),
});

