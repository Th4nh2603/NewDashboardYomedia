# RAG Guidelines

These rules apply to `apps/api/src/rag`.

## Purpose

This directory owns backend-only RAG ingestion, parsing, chunking, embedding, retrieval, reranking, context building, citations, and answer generation.

## Required References

- Read root `AGENTS.md`.
- Read `apps/api/AGENTS.md`.
- Use `docs/architecture/rag.md`, `docs/data/database.md`, and `docs/standards/security.md` for design guidance.

## Rules

- Apply tenant and brand filtering before retrieval, reranking, and generation.
- Preserve document metadata through ingestion, chunking, retrieval, and citation building.
- Generated answers must cite retrieved source chunks or report insufficient context.
- Do not use retrieved content from unauthorized documents as hidden context.
- Embedding and vector writes must be idempotent where practical and auditable by document, tenant, brand, and version.
- Retrieval code should expose scores and metadata needed for evaluation.

## Prohibited Actions

- Do not log full confidential documents, full chunks, private prompts, API keys, or unredacted private user data.
- Do not answer from general model knowledge when the user asked for document-grounded information and retrieval has insufficient context.
- Do not bypass repositories or authorization policies for document reads.
