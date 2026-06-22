export type RagStepStatus = "success" | "error" | "skipped";

export interface RagStep {
  name: string;
  status: RagStepStatus;
  durationMs?: number;
  summary: string;
}

export interface RagScope {
  userId: string;
  tenantId: string;
  allowedBrandIds: string[];
  allowedKnowledgeBaseIds: string[];
  requestedBrandId?: string;
  requestedKnowledgeBaseId?: string;
}

export interface RagRequest {
  query: string;
  scope: RagScope;
  topK?: number;
}

export interface RagDocumentMetadata {
  tenantId: string;
  brandId: string;
  knowledgeBaseId: string;
  documentId: string;
  chunkId: string;
  source: string;
  title: string;
  version: string;
  page?: number;
  section?: string;
  contentType: string;
  createdAt: string;
  embeddingModel: string;
  chunkingStrategy: string;
}

export interface RagChunk {
  content: string;
  metadata: RagDocumentMetadata;
}

export interface RagChunkCandidate extends RagChunk {
  score: number;
  searchType: "vector" | "keyword" | "hybrid";
}

export interface RagCitationDto {
  documentId: string;
  chunkId: string;
  title: string;
  source?: string;
  page?: number;
  section?: string;
  score?: number;
}

export interface RagChatResponseDto {
  answer: string;
  sources: RagCitationDto[];
  steps: RagStep[];
  insufficientContext: boolean;
}

export interface RagIngestionDocument {
  documentId: string;
  tenantId: string;
  brandId: string;
  knowledgeBaseId: string;
  title: string;
  source: string;
  contentType: string;
  version: string;
  createdBy: string;
  createdAt: string;
  content: string;
}

export interface ParsedDocument {
  text: string;
  metadata: Omit<RagDocumentMetadata, "chunkId" | "embeddingModel" | "chunkingStrategy">;
}

export interface ChunkDocumentInput {
  text: string;
  metadata: Omit<RagDocumentMetadata, "chunkId" | "embeddingModel" | "chunkingStrategy">;
  maxChunkSize: number;
  chunkOverlap: number;
  chunkingStrategy: string;
  embeddingModel: string;
}

export interface EmbeddedRagChunk extends RagChunk {
  embedding: number[];
}

export interface RagRetrievalFilters {
  tenantId: string;
  brandIds: string[];
  knowledgeBaseIds: string[];
}
