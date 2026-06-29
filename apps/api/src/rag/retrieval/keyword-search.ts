import type { RagChunkCandidate, RagRetrievalFilters } from "../rag.types.js";
import { searchLocalRagDocuments } from "./local-document-store.js";

export interface KeywordSearchInput {
  query: string;
  filters: RagRetrievalFilters;
  topK: number;
}

export interface KeywordSearch {
  search(input: KeywordSearchInput): Promise<RagChunkCandidate[]>;
}

export const keywordSearch: KeywordSearch = {
  async search(input: KeywordSearchInput): Promise<RagChunkCandidate[]> {
    return searchLocalRagDocuments(input);
  },
};
