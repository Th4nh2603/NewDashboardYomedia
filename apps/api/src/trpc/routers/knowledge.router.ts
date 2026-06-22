import { router, protectedProcedure } from "../trpc.js";
import { listKnowledgeBasesSchema } from "../../modules/knowledge-base/knowledge-base.schema.js";
import { knowledgeBaseService } from "../../modules/knowledge-base/knowledge-base.service.js";

export const knowledgeRouter = router({
  list: protectedProcedure
    .input(listKnowledgeBasesSchema.optional())
    .query(({ input, ctx }) =>
      knowledgeBaseService.listKnowledgeBases({
        filters: input ?? {},
        auth: {
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          allowedBrandIds: ctx.user.allowedBrandIds,
          allowedKnowledgeBaseIds: ctx.user.allowedKnowledgeBaseIds,
        },
      }),
    ),
});
