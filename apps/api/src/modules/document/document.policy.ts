import { AppError } from "../../shared/errors/app-error.js";
import type {
  DocumentAuthContext,
  ListDocumentsInput,
  ScopedDocumentListQuery,
} from "./document.types.js";

export const documentPolicy = {
  resolveListScope(
    auth: DocumentAuthContext,
    input: ListDocumentsInput,
  ): ScopedDocumentListQuery {
    const brandIds = input.brandId ? [input.brandId] : auth.allowedBrandIds;
    const knowledgeBaseIds = input.knowledgeBaseId
      ? [input.knowledgeBaseId]
      : auth.allowedKnowledgeBaseIds;

    if (input.brandId && !auth.allowedBrandIds.includes(input.brandId)) {
      throw new AppError("Requested brand scope is not allowed.", 403);
    }

    if (
      input.knowledgeBaseId &&
      !auth.allowedKnowledgeBaseIds.includes(input.knowledgeBaseId)
    ) {
      throw new AppError("Requested knowledge base scope is not allowed.", 403);
    }

    return {
      tenantId: auth.tenantId,
      brandIds,
      knowledgeBaseIds,
    };
  },
};
