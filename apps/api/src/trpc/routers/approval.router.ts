import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  approvalExecuteSchema,
  approvalIdSchema,
  approvalListSchema,
} from "../../modules/approval/approval.schema.js";
import { approvalService } from "../../modules/approval/approval.service.js";
import { AppError } from "../../shared/errors/app-error.js";

function appErrorToTrpcCode(statusCode: number): TRPCError["code"] {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  return "INTERNAL_SERVER_ERROR";
}

async function mapAppError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw new TRPCError({
        code: appErrorToTrpcCode(error.statusCode),
        message: error.message,
      });
    }
    throw error;
  }
}

export const approvalRouter = router({
  listPending: protectedProcedure
    .input(approvalListSchema)
    .query(({ ctx, input }) =>
      mapAppError(() => approvalService.listPending(ctx.user, input)),
    ),
  approve: protectedProcedure
    .input(approvalIdSchema)
    .mutation(({ ctx, input }) =>
      mapAppError(() => approvalService.approve(ctx.user, input.approvalId)),
    ),
  reject: protectedProcedure
    .input(approvalIdSchema)
    .mutation(({ ctx, input }) =>
      mapAppError(() => approvalService.reject(ctx.user, input.approvalId)),
    ),
  execute: protectedProcedure
    .input(approvalExecuteSchema)
    .mutation(({ ctx, input }) =>
      mapAppError(() => approvalService.execute(ctx.user, input)),
    ),
});
