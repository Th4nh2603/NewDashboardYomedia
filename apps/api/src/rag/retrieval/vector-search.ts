import type { RagChunkCandidate, RagRetrievalFilters } from "../rag.types.js";

export interface VectorSearchInput {
  embedding: number[];
  filters: RagRetrievalFilters;
  topK: number;
}

export interface VectorSearch {
  search(input: VectorSearchInput): Promise<RagChunkCandidate[]>;
}

export const vectorSearch: VectorSearch = {
  async search(_input: VectorSearchInput): Promise<RagChunkCandidate[]> {
    return [];
  },
};
