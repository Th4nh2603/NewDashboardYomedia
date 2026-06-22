import { documentPolicy } from "./document.policy.js";
import { documentRepository } from "./document.repository.js";
import { mapDocumentToDto } from "./document.mapper.js";
import type {
  CreateDocumentInput,
  DocumentAuthContext,
  DocumentDto,
  ListDocumentsInput,
} from "./document.types.js";

export const documentService = {
  async listDocuments(input: {
    auth: DocumentAuthContext;
    filters: ListDocumentsInput;
  }): Promise<DocumentDto[]> {
    const scope = documentPolicy.resolveListScope(input.auth, input.filters);
    const documents = await documentRepository.list(scope);
    return documents.map(mapDocumentToDto);
  },

  async createDocument(input: {
    auth: DocumentAuthContext;
    document: CreateDocumentInput;
  }): Promise<DocumentDto> {
    const scope = documentPolicy.resolveListScope(input.auth, {
      brandId: input.document.brandId,
      knowledgeBaseId: input.document.knowledgeBaseId,
    });
    const document = await documentRepository.createMetadata({
      ...input.document,
      tenantId: scope.tenantId,
      createdBy: input.auth.userId,
    });

    return mapDocumentToDto(document);
  },
};
