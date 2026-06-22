import type { EmbeddedRagChunk } from "../rag.types.js";

export interface VectorWriter {
  writeChunks(chunks: EmbeddedRagChunk[]): Promise<void>;
}

export const vectorWriter: VectorWriter = {
  async writeChunks(_chunks: EmbeddedRagChunk[]): Promise<void> {
    throw new Error("RAG vector writer is not configured.");
  },
};
