import { ragConfig } from "./rag.config.js";
import type {
  RagChatResponseDto,
  RagChunkCandidate,
  RagRequest,
  RagRetrievalFilters,
  RagStep,
} from "./rag.types.js";
import { answerGenerator, type RagAnswerGenerator } from "./generation/answer-generator.js";
import { buildCitations, validateCitations } from "./citations/citation-builder.js";
import { embedQuery } from "./retrieval/query-embedder.js";
import { vectorSearch, type VectorSearch } from "./retrieval/vector-search.js";
import { keywordSearch, type KeywordSearch } from "./retrieval/keyword-search.js";
import { filterAuthorizedCandidates } from "./retrieval/metadata-filter.js";
import { mergeHybridResults } from "./retrieval/hybrid-search.js";
import { reranker, type Reranker } from "./retrieval/reranker.js";
import { buildRagContext } from "./retrieval/context-builder.js";
import type { TextEmbedder } from "./ingestion/embedder.js";

const insufficientContextAnswer =
  "Em chưa tìm thấy đủ thông tin trong tài liệu được phép truy cập để trả lời chắc chắn.";

export interface RagServiceDependencies {
  textEmbedder?: TextEmbedder;
  vectorSearch?: VectorSearch;
  keywordSearch?: KeywordSearch;
  reranker?: Reranker;
  answerGenerator?: RagAnswerGenerator;
}

function now(): number {
  return Date.now();
}

function durationSince(start: number): number {
  return Date.now() - start;
}

function pushStep(steps: RagStep[], step: RagStep): void {
  steps.push(step);
}

function buildFilters(request: RagRequest): RagRetrievalFilters {
  const knowledgeBaseIds = request.scope.requestedKnowledgeBaseId
    ? [request.scope.requestedKnowledgeBaseId]
    : request.scope.allowedKnowledgeBaseIds;
  const brandIds = request.scope.requestedBrandId
    ? [request.scope.requestedBrandId]
    : request.scope.allowedBrandIds;

  return {
    tenantId: request.scope.tenantId,
    brandIds,
    knowledgeBaseIds,
  };
}

function insufficient(steps: RagStep[]): RagChatResponseDto {
  pushStep(steps, {
    name: "rag.insufficient_context",
    status: "skipped",
    summary:
      "Insufficient authorized context or valid citations for a grounded answer.",
  });
  return {
    answer: insufficientContextAnswer,
    sources: [],
    steps,
    insufficientContext: true,
  };
}

export class RagService {
  constructor(private readonly dependencies: RagServiceDependencies = {}) {}

  async answerFromDocuments(request: RagRequest): Promise<RagChatResponseDto> {
    const steps: RagStep[] = [];
    const topK = request.topK ?? ragConfig.defaultTopK;
    const filters = buildFilters(request);

    pushStep(steps, {
      name: "auth.scope.resolve",
      status: "success",
      summary: "Resolved tenant, brand, and knowledge-base scope from backend auth context.",
    });

    if (filters.brandIds.length === 0 || filters.knowledgeBaseIds.length === 0) {
      pushStep(steps, {
        name: "rag.retrieve.scope",
        status: "skipped",
        summary: "No authorized brand or knowledge-base scope is available.",
      });
      return insufficient(steps);
    }

    let queryEmbedding: number[] | undefined;
    try {
      const startedAt = now();
      queryEmbedding = await embedQuery(request.query, this.dependencies.textEmbedder);
      pushStep(steps, {
        name: "rag.query.embed",
        status: "success",
        durationMs: durationSince(startedAt),
        summary: "Embedded query on the backend.",
      });
    } catch {
      pushStep(steps, {
        name: "rag.query.embed",
        status: "skipped",
        summary: "Query embedding provider is not configured; using keyword retrieval only.",
      });
    }

    const activeVectorSearch = this.dependencies.vectorSearch ?? vectorSearch;
    const activeKeywordSearch = this.dependencies.keywordSearch ?? keywordSearch;

    let vectorResults: RagChunkCandidate[] = [];
    if (queryEmbedding) {
      try {
        const startedAt = now();
        vectorResults = await activeVectorSearch.search({ embedding: queryEmbedding, filters, topK });
        pushStep(steps, {
          name: "rag.retrieve.vector",
          status: "success",
          durationMs: durationSince(startedAt),
          summary: `Retrieved ${vectorResults.length} vector candidates inside authorized scope.`,
        });
      } catch {
        pushStep(steps, {
          name: "rag.retrieve.vector",
          status: "error",
          summary: "Vector search is not configured.",
        });
      }
    } else {
      pushStep(steps, {
        name: "rag.retrieve.vector",
        status: "skipped",
        summary: "Skipped vector search because query embedding is unavailable.",
      });
    }

    let keywordResults: RagChunkCandidate[] = [];
    try {
      const startedAt = now();
      keywordResults = await activeKeywordSearch.search({ query: request.query, filters, topK });
      pushStep(steps, {
        name: "rag.retrieve.keyword",
        status: "success",
        durationMs: durationSince(startedAt),
        summary: `Retrieved ${keywordResults.length} keyword candidates inside authorized scope.`,
      });
    } catch {
      pushStep(steps, {
        name: "rag.retrieve.keyword",
        status: "skipped",
        summary: "Keyword search is not configured.",
      });
    }

    const authorizedVectorResults = filterAuthorizedCandidates(vectorResults, filters);
    const authorizedKeywordResults = filterAuthorizedCandidates(keywordResults, filters);
    const mergedResults = mergeHybridResults(authorizedVectorResults, authorizedKeywordResults, topK);
    pushStep(steps, {
      name: "rag.hybrid.merge",
      status: "success",
      summary: `Merged ${mergedResults.length} authorized candidates.`,
    });

    const rerankedResults = await (this.dependencies.reranker ?? reranker).rerank(mergedResults, topK);
    pushStep(steps, {
      name: "rag.rerank",
      status: "success",
      summary: `Reranked ${rerankedResults.length} authorized candidates.`,
    });

    const context = buildRagContext(rerankedResults);
    pushStep(steps, {
      name: "rag.context.build",
      status: context.text.length >= ragConfig.minContextCharacters ? "success" : "skipped",
      summary: `Built sanitized model context from ${context.chunks.length} chunks.`,
    });

    if (context.text.length < ragConfig.minContextCharacters) {
      return insufficient(steps);
    }

    const citations = validateCitations(buildCitations(context.chunks), context.chunks);
    pushStep(steps, {
      name: "rag.citation.validate",
      status: citations.length > 0 ? "success" : "error",
      summary: `Validated ${citations.length} citations against retrieved chunks.`,
    });

    if (citations.length === 0) {
      return insufficient(steps);
    }

    try {
      const startedAt = now();
      const answer = await (this.dependencies.answerGenerator ?? answerGenerator).generate({
        query: request.query,
        context: context.text,
        citations,
      });
      pushStep(steps, {
        name: "rag.answer.generate",
        status: "success",
        durationMs: durationSince(startedAt),
        summary: "Generated document-grounded answer from authorized context.",
      });

      return {
        answer,
        sources: citations,
        steps,
        insufficientContext: false,
      };
    } catch {
      pushStep(steps, {
        name: "rag.answer.generate",
        status: "error",
        summary: "RAG answer generator is not configured.",
      });
      return insufficient(steps);
    }
  }
}

export const ragService = new RagService();
