import type { DocumentDto, DocumentMetadata } from "./document.types.js";

export function mapDocumentToDto(document: DocumentMetadata): DocumentDto {
  return {
    documentId: document.documentId,
    title: document.title,
    source: document.source,
    contentType: document.contentType,
    version: document.version,
    brandId: document.brandId,
    knowledgeBaseId: document.knowledgeBaseId,
    createdAt: document.createdAt,
  };
}
