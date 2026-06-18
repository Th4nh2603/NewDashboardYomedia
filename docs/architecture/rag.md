# RAG Architecture

## Purpose

Describe the backend RAG ingestion, retrieval, citation, and evaluation model used by the project.

## Scope

This document applies to `apps/api/src/rag`, RAG-related jobs in `apps/api/src/jobs`, knowledge-base and document modules, RAG agents, and deterministic RAG eval fixtures.

## Ingestion

Ingestion loads authorized documents, records metadata, parses content, chunks text, generates embeddings, and writes searchable vectors. Ingestion jobs live under `apps/api/src/jobs` and RAG code under `apps/api/src/rag`.

## Parsing

Parsing should preserve source, title, document ID, tenant ID, brand ID, content type, version, and page or section metadata when available.

## Chunking

Chunks should be stable, traceable to source documents, sized for retrieval quality, and stored with metadata needed for citations and authorization.

## Embeddings

Embedding calls must be backend-only. Do not log full chunks or provider keys. Store enough metadata to re-embed documents when model or chunking changes.

## Metadata

Every retrievable chunk should carry tenant, brand, document, source, version, chunk ID, and citation metadata.

## Retrieval

Retrieval must apply tenant and brand filters before ranking. Hybrid search can combine keyword and vector search when both are available.

## Tenant Filtering

Tenant scope comes from authenticated backend context. Client or model-provided tenant IDs must not be trusted.

## Brand Filtering

Brand access must be checked before retrieval. Unauthorized brand documents must not be included in candidate sets or hidden context.

## Reranking

Reranking may refine already-authorized candidates. It must preserve scores, source metadata, and chunk IDs for citations and evals.

## Citations

Answers must cite retrieved chunks. Citation builders should preserve source title, document ID, chunk ID, page/section where available, and URL or internal reference where allowed.

## Insufficient Context

If authorized retrieval does not provide enough evidence, return an insufficient-context response instead of inventing details or relying on general model knowledge.

## Hallucination Prevention

Constrain document-grounded answers to retrieved evidence, validate citations, and track unsupported claims in evals.

## Evaluation Metrics

Track retrieval recall, citation correctness, unsupported-claim rate, insufficient-context accuracy, tenant-isolation failures, brand-isolation failures, latency, token usage when available, and task-completion rate.

## Related Documents

- `docs/architecture/system.md`
- `docs/architecture/backend.md`
- `docs/architecture/ai-agent.md`
- `docs/data/database.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `evals/datasets/`
- `evals/graders/`
- `evals/scenarios/`
