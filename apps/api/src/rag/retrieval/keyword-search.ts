import type { RagChunkCandidate, RagRetrievalFilters } from "../rag.types.js";

export interface KeywordSearchInput {
  query: string;
  filters: RagRetrievalFilters;
  topK: number;
}

export interface KeywordSearch {
  search(input: KeywordSearchInput): Promise<RagChunkCandidate[]>;
}

export const keywordSearch: KeywordSearch = {
  async search(_input: KeywordSearchInput): Promise<RagChunkCandidate[]> {
    throw new Error("RAG keyword search is not configured.");
  },
};
