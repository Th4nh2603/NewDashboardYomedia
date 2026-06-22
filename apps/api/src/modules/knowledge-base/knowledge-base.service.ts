import { knowledgeBasePolicy } from "./knowledge-base.policy.js";
import { knowledgeBaseRepository } from "./knowledge-base.repository.js";
import { mapKnowledgeBaseToDto } from "./knowledge-base.mapper.js";
import type {
  KnowledgeBaseAuthContext,
  KnowledgeBaseDto,
  ListKnowledgeBasesInput,
} from "./knowledge-base.types.js";

export const knowledgeBaseService = {
  async listKnowledgeBases(input: {
    auth: KnowledgeBaseAuthContext;
    filters: ListKnowledgeBasesInput;
  }): Promise<KnowledgeBaseDto[]> {
    const scope = knowledgeBasePolicy.resolveListScope(input.auth, input.filters);
    const knowledgeBases = await knowledgeBaseRepository.list(scope);
    return knowledgeBases.map(mapKnowledgeBaseToDto);
  },
};
