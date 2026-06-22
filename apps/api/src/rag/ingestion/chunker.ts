import type { ChunkDocumentInput, RagChunk } from "../rag.types.js";

export function chunkDocument(input: ChunkDocumentInput): RagChunk[] {
  const text = input.text.trim();
  if (!text) return [];

  const chunks: RagChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + input.maxChunkSize, text.length);
    const content = text.slice(start, end).trim();

    if (content) {
      chunks.push({
        content,
        metadata: {
          ...input.metadata,
          chunkId: `${input.metadata.documentId}:${index}`,
          embeddingModel: input.embeddingModel,
          chunkingStrategy: input.chunkingStrategy,
        },
      });
    }

    if (end === text.length) break;
    start = Math.max(end - input.chunkOverlap, start + 1);
    index += 1;
  }

  return chunks;
}

export function chunkText(text: string): string[] {
  return text ? [text] : [];
}
