export interface DocumentMetadata {
  documentId: string;
  tenantId: string;
  brandId: string;
  knowledgeBaseId: string;
  title: string;
  source: string;
  contentType: string;
  version: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentDto {
  documentId: string;
  title: string;
  source: string;
  contentType: string;
  version: string;
  brandId: string;
  knowledgeBaseId: string;
  createdAt: string;
}

export interface DocumentAuthContext {
  userId: string;
  tenantId: string;
  permissions: string[];
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
}

export interface ListDocumentsInput {
  brandId?: string;
  knowledgeBaseId?: string;
}

export interface CreateDocumentInput {
  brandId: string;
  knowledgeBaseId: string;
  title: string;
  source: string;
  contentType: string;
  version?: string;
  content: string;
}

export interface ScopedDocumentListQuery {
  tenantId: string;
  brandIds: string[];
  knowledgeBaseIds: string[];
}
