import { router, protectedProcedure } from "../trpc.js";
import { listDocumentsSchema } from "../../modules/document/document.schema.js";
import { documentService } from "../../modules/document/document.service.js";

export const documentRouter = router({
  list: protectedProcedure
    .input(listDocumentsSchema.optional())
    .query(({ input, ctx }) =>
      documentService.listDocuments({
        filters: input ?? {},
        auth: {
          userId: ctx.user.id,
          tenantId: ctx.user.tenantId,
          permissions: ctx.user.permissions,
          allowedBrandIds: ctx.user.allowedBrandIds,
          allowedKnowledgeBaseIds: ctx.user.allowedKnowledgeBaseIds,
        },
      }),
    ),
});
