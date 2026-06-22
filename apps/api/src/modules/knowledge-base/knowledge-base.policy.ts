import { AppError } from "../../shared/errors/app-error.js";
import type {
  KnowledgeBaseAuthContext,
  ListKnowledgeBasesInput,
  ScopedKnowledgeBaseQuery,
} from "./knowledge-base.types.js";

export const knowledgeBasePolicy = {
  resolveListScope(
    auth: KnowledgeBaseAuthContext,
    input: ListKnowledgeBasesInput,
  ): ScopedKnowledgeBaseQuery {
    if (input.brandId && !auth.allowedBrandIds.includes(input.brandId)) {
      throw new AppError("Requested brand scope is not allowed.", 403);
    }

    return {
      tenantId: auth.tenantId,
      brandIds: input.brandId ? [input.brandId] : auth.allowedBrandIds,
      knowledgeBaseIds: auth.allowedKnowledgeBaseIds,
    };
  },
};
