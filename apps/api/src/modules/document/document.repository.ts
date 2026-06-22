import type {
  CreateDocumentInput,
  DocumentMetadata,
  ScopedDocumentListQuery,
} from "./document.types.js";

function notImplemented(operation: string): never {
  throw new Error(`Document repository ${operation} is not implemented yet.`);
}

export const documentRepository = {
  async list(_query: ScopedDocumentListQuery): Promise<DocumentMetadata[]> {
    return notImplemented("list");
  },

  async createMetadata(_input: CreateDocumentInput & {
    tenantId: string;
    createdBy: string;
  }): Promise<DocumentMetadata> {
    return notImplemented("createMetadata");
  },
};
