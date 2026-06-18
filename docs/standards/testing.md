# Testing

## Purpose

Define expected test and evaluation coverage for application, backend, frontend, RAG, agent, authorization, and tenant-isolation changes.

## Scope

This document covers test strategy and available verification commands. It does not invent test infrastructure that is not currently present in the repository.

## Unit Testing

Unit tests should cover pure functions, policies, service logic, DTO mappers, validators, chunking, citation validation, agent routing decisions, and tool authorization decisions.

## Integration Testing

Integration tests should cover tRPC procedures, Express middleware, service-to-repository flows, auth context construction, tenant filtering, brand filtering, and error mapping.

## API Testing

API tests should verify input validation, authenticated and unauthenticated behavior, permission denial, safe error responses, and DTO compatibility with the frontend.

## Repository Testing

Repository tests should verify scoped queries, transaction behavior, indexes used by expected access patterns, and tenant/brand filters. Use a disposable test database when database infrastructure is available.

## Frontend Testing

Frontend tests should verify rendering, route behavior, form validation, loading states, error states, empty states, and accessibility. Frontend tests must not mock backend authorization as if it were trusted client logic.

## Browser End-To-End Testing

Browser validation is required for visible UI changes. Check desktop and mobile widths, keyboard navigation, focus states, loading states, error states, and critical dashboard/chat workflows.

## Agent Evaluation

Agent evals should track intent accuracy, routing accuracy, tool-selection accuracy, task-completion rate, latency, token usage when available, and safe fallback behavior.

## RAG Evaluation

RAG evals should track retrieval recall, citation correctness, unsupported-claim rate, insufficient-context behavior, tenant-isolation failures, brand-isolation failures, latency, and token usage when available.

## Authorization Tests

Authorization tests should cover missing auth, missing permission, wrong tenant, wrong brand, cross-tenant IDs, cross-brand IDs, model-suggested unauthorized scope, and MCP tool denial.

## Tenant-Isolation Tests

Tenant-isolation tests should assert that tenant filters are applied before database queries and retrieval. Fixtures should include identical document names, IDs, or content across tenants to catch accidental leakage.

## Current Verification Commands

```bash
pnpm verify
pnpm verify:changed
pnpm check:architecture
pnpm eval
pnpm --filter nova-ai-creative-suite lint
pnpm --filter nova-ai-creative-suite build
pnpm --filter @yomedia/api-server build
pnpm --filter mobile lint
```

The root `pnpm test` command is currently a placeholder and should not be reported as a passing test command.

## Related Documents

- `docs/architecture/frontend.md`
- `docs/architecture/backend.md`
- `docs/architecture/ai-agent.md`
- `docs/architecture/rag.md`
- `docs/standards/code-review.md`
- `evals/datasets/`
