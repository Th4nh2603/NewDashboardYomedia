export interface CitationValidationInput {
  citations: Array<{ chunkId: string }>;
  retrievedChunkIds: string[];
}

export function validateCitations(input: CitationValidationInput): boolean {
  const retrievedChunkIds = new Set(input.retrievedChunkIds);

  return (
    input.citations.length > 0 &&
    input.citations.every((citation) => retrievedChunkIds.has(citation.chunkId))
  );
}
