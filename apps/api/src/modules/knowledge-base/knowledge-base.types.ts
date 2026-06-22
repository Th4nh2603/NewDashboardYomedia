export interface KnowledgeBase {
  knowledgeBaseId: string;
  tenantId: string;
  brandId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface KnowledgeBaseDto {
  knowledgeBaseId: string;
  brandId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface KnowledgeBaseAuthContext {
  userId: string;
  tenantId: string;
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
}

export interface ListKnowledgeBasesInput {
  brandId?: string;
}

export interface ScopedKnowledgeBaseQuery {
  tenantId: string;
  brandIds: string[];
  knowledgeBaseIds: string[];
}
