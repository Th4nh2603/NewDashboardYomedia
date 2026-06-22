import { router, protectedProcedure } from "../trpc.js";
import { chatMessageSchema } from "../../modules/chat/chat.schema.js";
import { chatService } from "../../modules/chat/chat.service.js";

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(chatMessageSchema)
    .mutation(({ input, ctx }) =>
      chatService.sendMessage({
        input,
        auth: {
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          permissions: ctx.user.permissions,
          allowedBrandIds: ctx.user.allowedBrandIds,
          allowedKnowledgeBaseIds: ctx.user.allowedKnowledgeBaseIds,
          allowedMcpTools: ctx.user.allowedMcpTools,
        },
      }),
    ),
});
