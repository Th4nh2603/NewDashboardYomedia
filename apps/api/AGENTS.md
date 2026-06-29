# API Agent Guidelines

These rules apply to `apps/api`.

## Required References

- Read root `AGENTS.md` first.
- Use `docs/architecture/backend.md` for backend API structure and module details.
- Use `docs/architecture/ai-agent.md` and `docs/architecture/rag.md` for AI, RAG, MCP, SQL, and tools architecture.
- Use `docs/standards/coding.md`, `docs/standards/security.md`, and `docs/standards/testing.md` for implementation standards.
- Read `apps/api/src/ai/AGENTS.md` when changing AI agents, tools, MCP adapters, memory, guardrails, prompts, or orchestration.
- Read `apps/api/src/rag/AGENTS.md` when changing ingestion, retrieval, reranking, citations, or answer generation.
- Read `apps/web/AGENTS.md` and `docs/architecture/frontend.md` when backend changes affect frontend DTOs, API clients, auth flows, routes, or chat UI.

## Responsibility

`apps/api` is the Express + tRPC backend. It owns business logic, authentication, authorization, tenant and brand scope, database access, chat orchestration, RAG, MCP tools, validation, guardrails, structured logging, and frontend-safe DTOs.

## Structure

- `src/server.ts`: process entrypoint.
- `src/app.ts`: Express app composition, middleware, health check, and tRPC mount.
- `src/config`: environment, database, AI, RAG, and MCP configuration.
- `src/trpc`: context, base procedures, middleware, and routers.
- `src/modules`: business logic by domain.
- `src/ai`: providers, agents, runtime context, tools, memory, guardrails, prompts, and registry.
- `src/rag`: ingestion, retrieval, generation, and pipeline code.
- `src/mcp`: client manager, registries, adapters, security, and MCP types.
- `src/database`: Prisma schema, migrations, seed, client, and persistence infrastructure.
- `src/shared`: backend errors, logger, constants, DTOs, and utilities.

## Commands

- `pnpm --filter @yomedia/api-server dev`
- `pnpm --filter @yomedia/api-server build`
- `pnpm check:architecture`

## Layering Rules

- Backend trusted scope must be built by server-side context builders and policies, never by trusting client hints.
- Agent branches must remain stable: `RagAgent` answers from documents, `SqlAgent` reads/reports queries, `GeneralAgent` handles normal LLM answers, and `DemoAgent` handles demo/SFTP/preview workflows through ToolGateway.
- Do not bypass `PolicyGate`, `ToolGateway`, or `ToolExecutor` for agent tool execution.
- Do not add MCP to the merged agent core path until explicitly requested.
- Destructive SFTP operations require HITL approval and policy revalidation before execution.
- Approval lifecycle and audit logs must be durable. In-memory-only approval state is not acceptable for production agent/tool flows.
- Agents must not call SFTP services directly; SFTP access belongs behind ToolGateway, approved execution, ToolExecutor, SFTP service, and durable audit.
- Express middleware, controllers, and tRPC procedures must stay thin.
- tRPC procedures validate input, derive authenticated context, call services, and return DTOs.
- Services own business workflows and must not depend directly on Express `Request` or `Response`.
- Repositories own persistence. Services call repositories instead of importing database clients directly.
- Policies own authorization decisions. Apply tenant and brand authorization before repository queries and before RAG retrieval.
- Shared input and output schemas belong in `packages/contracts` when used across apps. Existing local Zod schemas may remain local until extraction is useful.
- Return frontend-safe DTOs, not raw database entities, secrets, stack traces, provider internals, prompts, or private document contents.

## Authentication And Authorization

- Never trust client-provided tenant, brand, role, permission, knowledge-base, SQL, or MCP scope.
- Derive sensitive scope from authenticated server context.
- Enforce tenant and brand isolation before database queries and RAG retrieval.
- Apply permission checks before external tool calls, document reads, mutations, and SQL-like operations.

## Validation

- Validate external input with Zod before service execution.
- Validate MCP tool arguments against allowlisted schemas.
- Validate AI outputs before using them for tool calls, SQL, repository filters, or user-facing answers.

## Error Handling And Logging

- Use typed application errors for expected failures.
- Do not leak stack traces, secrets, raw provider responses, raw prompts, or confidential document text.
- Use structured logs with request IDs and sanitized summaries.
- Agent traces must include step summaries, duration, status, and sanitized error text only.

## Backend Testing

- Add unit tests for service and policy logic when test infrastructure is available.
- Add integration tests for tRPC routes, auth, tenant isolation, brand isolation, RAG retrieval filters, and MCP tool authorization when infrastructure is available.
- Run `pnpm --filter @yomedia/api-server build` after TypeScript backend changes.
- Run `pnpm check:architecture` after changes to routers, services, repositories, AI, RAG, MCP, or database access.

## Prohibited Actions

- Do not put business logic in tRPC procedures.
- Do not import database clients directly from controllers or tRPC routers.
- Do not let services depend on Express `Request` or `Response`.
- Do not log secrets, credentials, private prompts, full confidential documents, private user data, or unredacted sensitive model inputs.
- Do not add fake provider, RAG, or tool implementations that appear functional but silently do nothing.
