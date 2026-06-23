import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { chatMessageSchema } from "../../modules/chat/chat.schema.js";
import { chatService } from "../../modules/chat/chat.service.js";
import { AppError } from "../../shared/errors/app-error.js";

function appErrorToTrpcCode(statusCode: number): TRPCError["code"] {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  return "INTERNAL_SERVER_ERROR";
}

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(chatMessageSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await chatService.sendMessage({
          input,
          requestId: ctx.requestId,
          auth: {
            userId: ctx.user.id,
            tenantId: ctx.user.tenantId,
            permissions: ctx.user.permissions,
            allowedBrandIds: ctx.user.allowedBrandIds,
            allowedKnowledgeBaseIds: ctx.user.allowedKnowledgeBaseIds,
            allowedMcpTools: ctx.user.allowedMcpTools,
          },
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw new TRPCError({
            code: appErrorToTrpcCode(error.statusCode),
            message: error.message,
          });
        }
        throw error;
      }
    }),
});
