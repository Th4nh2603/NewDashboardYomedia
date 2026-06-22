import type { KnowledgeBase, KnowledgeBaseDto } from "./knowledge-base.types.js";

export function mapKnowledgeBaseToDto(knowledgeBase: KnowledgeBase): KnowledgeBaseDto {
  return {
    knowledgeBaseId: knowledgeBase.knowledgeBaseId,
    brandId: knowledgeBase.brandId,
    name: knowledgeBase.name,
    description: knowledgeBase.description,
    createdAt: knowledgeBase.createdAt,
  };
}
