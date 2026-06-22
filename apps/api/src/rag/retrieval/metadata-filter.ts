import type { RagChunkCandidate, RagRetrievalFilters } from "../rag.types.js";

export function filterAuthorizedCandidates(
  candidates: RagChunkCandidate[],
  filters: RagRetrievalFilters,
): RagChunkCandidate[] {
  return candidates.filter((candidate) => {
    const metadata = candidate.metadata;

    return (
      metadata.tenantId === filters.tenantId &&
      filters.brandIds.includes(metadata.brandId) &&
      filters.knowledgeBaseIds.includes(metadata.knowledgeBaseId)
    );
  });
}
