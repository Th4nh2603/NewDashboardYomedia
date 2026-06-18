import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { chatService } from "../../modules/chat/chat.service.js";

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid().optional(),
        message: z.string().min(1).max(10_000),
        pageContext: z
          .object({
            route: z.string(),
            title: z.string().optional(),
            selectedBrandId: z.string().optional(),
            filters: z.record(z.unknown()).optional(),
          })
          .optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      chatService.sendMessage({
        ...input,
        userId: ctx.user.id,
        tenantId: ctx.user.tenantId,
        permissions: ctx.user.permissions,
        allowedBrandIds: ctx.user.allowedBrandIds,
        allowedKnowledgeBaseIds: ctx.user.allowedKnowledgeBaseIds,
        allowedMcpTools: ctx.user.allowedMcpTools,
      }),
    ),
});
