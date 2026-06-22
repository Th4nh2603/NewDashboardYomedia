import { ingestDocument } from "../rag/ingestion/ingestion.pipeline.js";
import type { RagIngestionDocument } from "../rag/rag.types.js";

export const documentIngestionJob = {
  async run(document: RagIngestionDocument) {
    return ingestDocument(document);
  },
};
