import type { RagChunkCandidate, RagCitationDto } from "../rag.types.js";

export function buildCitations(candidates: RagChunkCandidate[]): RagCitationDto[] {
  return candidates.map((candidate) => ({
    documentId: candidate.metadata.documentId,
    chunkId: candidate.metadata.chunkId,
    title: candidate.metadata.title,
    source: candidate.metadata.source,
    page: candidate.metadata.page,
    section: candidate.metadata.section,
    score: candidate.score,
  }));
}

export function validateCitations(
  citations: RagCitationDto[],
  candidates: RagChunkCandidate[],
): RagCitationDto[] {
  const allowedChunkIds = new Set(candidates.map((candidate) => candidate.metadata.chunkId));
  return citations.filter((citation) => allowedChunkIds.has(citation.chunkId));
}
