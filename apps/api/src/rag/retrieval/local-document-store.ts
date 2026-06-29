import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ragConfig } from "../rag.config.js";
import type { RagChunk, RagChunkCandidate, RagRetrievalFilters } from "../rag.types.js";
import { chunkDocument } from "../ingestion/chunker.js";

interface LocalRagDocumentManifest {
  documents?: Array<{
    documentId: string;
    title: string;
    source: string;
    textPath?: string;
    contentType: string;
    status: string;
    tenantId: string;
    brandId: string;
    knowledgeBaseId: string;
    version?: string;
  }>;
}

const dataRoot = path.resolve(
  fileURLToPath(new URL("../../../data/rag-documents", import.meta.url)),
);

let cachedChunks: RagChunk[] | undefined;

function tokenize(input: string): string[] {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
}

function scoreChunk(queryTokens: string[], content: string): number {
  const contentTokens = new Set(tokenize(content));
  let score = 0;
  for (const token of queryTokens) {
    if (contentTokens.has(token)) score += 1;
  }
  return score / Math.max(queryTokens.length, 1);
}

async function readManifest(): Promise<LocalRagDocumentManifest> {
  const raw = await readFile(path.join(dataRoot, "manifest.json"), "utf8");
  return JSON.parse(raw) as LocalRagDocumentManifest;
}

async function loadChunks(): Promise<RagChunk[]> {
  if (cachedChunks) return cachedChunks;
  const manifest = await readManifest();
  const chunks: RagChunk[] = [];

  for (const document of manifest.documents ?? []) {
    if (document.status !== "indexed" || !document.textPath) continue;
    const text = await readFile(path.join(dataRoot, document.textPath), "utf8");
    chunks.push(
      ...chunkDocument({
        text,
        metadata: {
          tenantId: document.tenantId,
          brandId: document.brandId,
          knowledgeBaseId: document.knowledgeBaseId,
          documentId: document.documentId,
          source: document.source,
          title: document.title,
          version: document.version ?? "1",
          contentType: document.contentType,
          createdAt: new Date(0).toISOString(),
        },
        maxChunkSize: ragConfig.maxChunkSize,
        chunkOverlap: ragConfig.chunkOverlap,
        chunkingStrategy: ragConfig.defaultChunkingStrategy,
        embeddingModel: "local-keyword",
      }),
    );
  }

  cachedChunks = chunks;
  return chunks;
}

function inScope(chunk: RagChunk, filters: RagRetrievalFilters): boolean {
  return (
    chunk.metadata.tenantId === filters.tenantId &&
    filters.brandIds.includes(chunk.metadata.brandId) &&
    filters.knowledgeBaseIds.includes(chunk.metadata.knowledgeBaseId)
  );
}

export async function searchLocalRagDocuments(input: {
  query: string;
  filters: RagRetrievalFilters;
  topK: number;
}): Promise<RagChunkCandidate[]> {
  const queryTokens = tokenize(input.query);
  if (queryTokens.length === 0) return [];

  return (await loadChunks())
    .filter((chunk) => inScope(chunk, input.filters))
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTokens, chunk.content),
      searchType: "keyword" as const,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.topK);
}
