import type { ParsedDocument, RagIngestionDocument } from "../rag.types.js";

export function parseDocument(document: RagIngestionDocument): ParsedDocument {
  if (!document.content.trim()) {
    throw new Error("Document content is empty.");
  }

  return {
    text: document.content,
    metadata: {
      tenantId: document.tenantId,
      brandId: document.brandId,
      knowledgeBaseId: document.knowledgeBaseId,
      documentId: document.documentId,
      source: document.source,
      title: document.title,
      version: document.version,
      contentType: document.contentType,
      createdAt: document.createdAt,
    },
  };
}
