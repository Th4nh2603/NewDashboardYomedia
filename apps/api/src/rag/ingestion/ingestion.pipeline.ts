import { ragConfig } from "../rag.config.js";
import type { EmbeddedRagChunk, RagIngestionDocument, RagStep } from "../rag.types.js";
import { cleanText } from "./cleaner.js";
import { chunkDocument } from "./chunker.js";
import { embedder, type TextEmbedder } from "./embedder.js";
import { parseDocument } from "./parser.js";
import { vectorWriter, type VectorWriter } from "./vector-writer.js";

export interface IngestionPipelineResult {
  documentId: string;
  chunkCount: number;
  steps: RagStep[];
}

export async function ingestDocument(
  document: RagIngestionDocument,
  dependencies: {
    textEmbedder?: TextEmbedder;
    writer?: VectorWriter;
  } = {},
): Promise<IngestionPipelineResult> {
  const steps: RagStep[] = [];
  const parsed = parseDocument(document);
  steps.push({ name: "rag.ingest.parse", status: "success", summary: "Parsed document text and metadata." });

  const cleanedText = cleanText(parsed.text);
  steps.push({ name: "rag.ingest.clean", status: "success", summary: "Cleaned document text without logging raw content." });

  const chunks = chunkDocument({
    text: cleanedText,
    metadata: parsed.metadata,
    maxChunkSize: ragConfig.maxChunkSize,
    chunkOverlap: ragConfig.chunkOverlap,
    chunkingStrategy: ragConfig.defaultChunkingStrategy,
    embeddingModel: ragConfig.defaultEmbeddingModel,
  });
  steps.push({ name: "rag.ingest.chunk", status: "success", summary: `Created ${chunks.length} chunks.` });

  const activeEmbedder = dependencies.textEmbedder ?? embedder;
  const embeddedChunks: EmbeddedRagChunk[] = [];
  for (const chunk of chunks) {
    embeddedChunks.push({
      ...chunk,
      embedding: await activeEmbedder.embed({
        text: chunk.content,
        model: chunk.metadata.embeddingModel,
      }),
    });
  }
  steps.push({ name: "rag.ingest.embed", status: "success", summary: `Embedded ${embeddedChunks.length} chunks.` });

  await (dependencies.writer ?? vectorWriter).writeChunks(embeddedChunks);
  steps.push({ name: "rag.ingest.vector.write", status: "success", summary: "Stored chunk embeddings and metadata." });

  return {
    documentId: document.documentId,
    chunkCount: embeddedChunks.length,
    steps,
  };
}
