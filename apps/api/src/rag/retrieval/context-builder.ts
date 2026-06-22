import { ragConfig } from "../rag.config.js";
import type { RagChunkCandidate } from "../rag.types.js";

export interface RagContext {
  text: string;
  chunks: RagChunkCandidate[];
}

export function buildRagContext(candidates: RagChunkCandidate[]): RagContext {
  const chunks: RagChunkCandidate[] = [];
  let text = "";

  for (const candidate of candidates) {
    const next = `[${candidate.metadata.chunkId}] ${candidate.content}`;
    if (text.length + next.length > ragConfig.maxContextCharacters) break;
    chunks.push(candidate);
    text = text ? `${text}\n\n${next}` : next;
  }

  return { text, chunks };
}
