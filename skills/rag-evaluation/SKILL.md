# RAG Evaluation Skill

## Purpose

Evaluate and maintain RAG behavior for retrieval quality, citation correctness, insufficient-context handling, tenant isolation, and brand isolation.

## When To Use

Use this skill when changing document ingestion, parsing, chunking, embeddings, metadata filters, retrieval, reranking, citation building, answer generation, or RAG evals.

## Required Files To Inspect

- `AGENTS.md`
- `apps/api/AGENTS.md`
- `apps/api/src/rag/AGENTS.md`
- `docs/architecture/rag.md`
- `docs/architecture/ai-agent.md`
- `docs/standards/security.md`
- Relevant files in `apps/api/src/rag`
- Relevant files in `apps/api/src/modules/knowledge-base` and `apps/api/src/modules/documents`
- `evals/datasets/`
- `evals/graders/`
- `evals/scenarios/`

## Workflow

1. Confirm tenant and brand filters are applied before retrieval.
2. Confirm metadata is preserved through ingestion, retrieval, and citations.
3. Confirm insufficient-context behavior avoids unsupported claims.
4. Confirm confidential document contents are not logged.
5. Update deterministic eval fixtures when behavior changes.
6. Run RAG eval validation and backend checks.

## Validation Commands

```bash
pnpm eval:rag
pnpm --filter @yomedia/api-server build
pnpm check:architecture
```

## Prohibited Actions

- Do not retrieve unauthorized documents as hidden context.
- Do not answer document-grounded questions without citations.
- Do not invent answers when authorized retrieval is insufficient.
- Do not log full chunks, private documents, private prompts, or provider keys.

## Completion Checklist

- [ ] Tenant and brand prefilters verified.
- [ ] Metadata and citations preserved.
- [ ] Insufficient-context behavior reviewed.
- [ ] RAG eval fixtures updated if needed.
- [ ] Relevant commands run and results recorded.

## Result Report Format

- RAG areas changed:
- Eval fixtures affected:
- Validation commands run:
- Citation/tenant/brand notes:
- Remaining TODOs:
