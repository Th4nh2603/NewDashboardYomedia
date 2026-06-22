import type { RagChunkCandidate } from "../rag.types.js";

export function mergeHybridResults(
  vectorResults: RagChunkCandidate[],
  keywordResults: RagChunkCandidate[],
  topK: number,
): RagChunkCandidate[] {
  const byChunkId = new Map<string, RagChunkCandidate>();

  for (const result of [...vectorResults, ...keywordResults]) {
    const existing = byChunkId.get(result.metadata.chunkId);
    if (!existing || result.score > existing.score) {
      byChunkId.set(result.metadata.chunkId, {
        ...result,
        searchType: existing ? "hybrid" : result.searchType,
      });
    }
  }

  return [...byChunkId.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
