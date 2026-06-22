import type { RagChunkCandidate } from "../rag.types.js";

export interface Reranker {
  rerank(candidates: RagChunkCandidate[], topK: number): Promise<RagChunkCandidate[]>;
}

export const reranker: Reranker = {
  async rerank(candidates: RagChunkCandidate[], topK: number): Promise<RagChunkCandidate[]> {
    return [...candidates].sort((left, right) => right.score - left.score).slice(0, topK);
  },
};
