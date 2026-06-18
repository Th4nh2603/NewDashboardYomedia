# Codex Code Review Checklist

## Purpose

Provide a review checklist for Codex, developers, and PR reviewers.

## Scope

Use this checklist for documentation, frontend, backend, database, RAG, agent, MCP, script, workflow, and shared-package changes.

Use this checklist for PR review, `pnpm codex:review`, and manual final checks.

## Correctness

- Does the change implement the requested behavior?
- Are edge cases handled?
- Are async operations awaited and errors handled?
- Are existing features preserved?

## Architecture

- Frontend remains UI-only.
- Business logic lives in backend services.
- Express controllers and tRPC procedures remain thin.
- Services do not depend on Express `Request` or `Response`.
- Database access goes through repositories.
- Shared schemas are in contracts when shared across apps.

## Security

- No secrets, tokens, passwords, API keys, private prompts, or confidential documents are committed.
- Logs redact sensitive data.
- External input is validated with Zod.
- Prompt injection and tool injection paths are considered.

## Authentication

- Protected operations require authenticated context.
- Client-provided user, role, tenant, and brand scope is not trusted.

## Authorization

- Permission checks happen before protected reads, writes, RAG retrieval, MCP tool calls, and SQL-like operations.
- Policies are tested or reviewed for denial behavior.

## Tenant Isolation

- Tenant filters are applied before database queries and retrieval.
- Cross-tenant IDs from clients, tools, or model output are rejected or ignored.

## Brand Isolation

- Brand filters are applied before database queries and retrieval.
- Brand permissions are recomputed on the backend.

## Database Safety

- Repositories own persistence.
- Queries are parameterized or ORM-backed.
- Migrations include rollback notes and index considerations.
- Transactions protect multi-step writes.

## Error Handling

- Expected failures use typed errors.
- User-facing errors are safe.
- Operator logs contain sanitized diagnostic context.

## Logging

- Logs include request/run IDs where available.
- Agent steps log summaries, status, and durations.
- Logs do not contain private prompts, full documents, or secrets.

## Tests

- Relevant unit, integration, frontend, RAG, agent, auth, tenant, and brand tests are added or updated when infrastructure exists.
- Commands reported as passing were actually executed.

## Performance

- Expensive retrieval, database, provider, and MCP calls are bounded.
- New indexes are considered for new query patterns.
- Large payloads and full document logs are avoided.

## Complexity

- The change is focused.
- No unnecessary abstractions, rewrites, or unrelated moves are included.

## Backward Compatibility

- API contract changes are documented.
- Frontend and backend stay compatible.
- Existing data and migrations are considered.

## Unrelated Changes

- Unrelated formatting, file moves, deletions, and dependency changes are avoided.
- Existing uncommitted user changes are not reverted.

## Related Documents

- `docs/standards/coding.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `docs/architecture/system.md`
