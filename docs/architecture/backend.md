# Backend Architecture: apps/api

## Purpose

Describe the Express + tRPC backend structure, layering rules, and API responsibilities.

## Scope

This document applies to `apps/api`, including Express app wiring, tRPC routers, middleware, services, repositories, policies, schemas, DTOs, background jobs, AI/RAG/MCP integration points, and backend validation.

Use this reference when changing the backend in `apps/api`.

## Read Order

1. Read root `AGENTS.md` for repository-wide rules.
2. Read `apps/api/AGENTS.md` for mandatory backend rules.
3. Use this file as reference for backend API structure and module details.
4. Read `docs/architecture/frontend.md` when backend changes affect frontend DTOs, routes, chat UI, auth flows, or API client behavior.
5. Read `docs/architecture/ai-agent.md` and `docs/architecture/rag.md` for AI agent, RAG, MCP, SQL, or tools architecture.

## Architecture

- `apps/api` is the backend source of truth for authentication, authorization, tenant scope, brand scope, business logic, database access, chat orchestration, RAG, MCP, guardrails, logging, background jobs, validation, and response DTOs.
- The frontend must call this backend and render DTOs. Do not move backend responsibilities into `apps/web`.
- Keep `packages/api` as the shared client contract/transformer package unless the repo is intentionally migrated. Do not rename `apps/api` to `@yomedia/api`; the server package is `@yomedia/api-server`.
- Use Express as the HTTP app, tRPC as the primary API layer, and TypeScript with strict ESM imports.

## Folder Map

- `src/server.ts`: process entrypoint. Start the Express app here.
- `src/app.ts`: Express app composition, middleware, health check, and tRPC mount.
- `src/config`: environment, database, AI, RAG, and MCP configuration.
- `src/trpc`: tRPC context, base procedures, middleware, and routers.
- `src/modules`: business logic by domain. Keep router code thin and call services here.
- `src/ai`: provider abstraction, multi-agent orchestration, runtime context, tools, memory, guardrails, prompts, and registry.
- `src/rag`: ingestion, retrieval, generation, and pipeline code.
- `src/mcp`: MCP client manager, registries, adapters, security, and MCP types.
- `src/database`: Prisma schema, migrations, seed, shared database client, and repositories.
- `src/middleware`: Express middleware such as CORS, auth, errors, request IDs, and rate limit.
- `src/jobs`: background jobs such as document ingestion, embedding, and conversation summaries.
- `src/shared`: shared backend errors, logger, constants, DTOs, and utilities.
- `uploads`: backend-owned uploaded files. Do not serve or trust files without validation.

## Module Pattern

For domain modules, prefer this layout:

```text
modules/<domain>/
+-- <domain>.service.ts
+-- <domain>.repository.ts
+-- <domain>.schema.ts
+-- <domain>.policy.ts
+-- <domain>.mapper.ts
+-- <domain>.types.ts
```

Use only the files that make sense for the domain, but keep responsibilities clear:

- `router`: transport layer, tRPC input/output, calls service.
- `schema`: Zod input validation.
- `service`: business workflow and transaction boundaries.
- `policy`: tenant, brand, role, permission, and knowledge-base checks.
- `repository`: database access only.
- `mapper`: entity-to-DTO conversion.
- `types`: internal TypeScript types.

## API Rules

- Validate every input with Zod at the tRPC boundary or before service execution.
- Never trust `tenantId`, `brandId`, roles, permissions, knowledge-base IDs, or MCP tool names from the client.
- Derive sensitive scope from authenticated backend context.
- Return clear DTOs for the frontend. Do not leak raw database entities, secrets, stack traces, or provider internals.
- Keep routers thin. If logic grows beyond input parsing and service calls, move it into `modules`.
- Use `protectedProcedure` for authenticated calls and explicit permission middleware/policy checks for privileged calls.
- Keep Express middleware generic and tRPC middleware/API policies explicit.

## Chat And Agents

- Chat requests should flow through `chat.router.ts` -> `modules/chat/chat.service.ts` -> orchestrator/agents.
- Use `AgentContext` as the scoped runtime context. It must include authenticated `userId`, `tenantId`, permissions, allowed brands, allowed knowledge bases, and allowed MCP tools.
- The intent agent may classify the task, but it must not grant or infer permissions.
- SQL agent output must be read-only and backend-scoped by tenant and allowed brand IDs before execution.
- RAG retrieval must filter by allowed knowledge-base IDs.
- MCP tool calls must go through allowlist and permission checks before execution.
- Response agent should produce a frontend DTO with `answer`, optional `data`, `sources`, `toolCalls`, and `steps`.

## RAG Rules

- Upload/ingestion flow: parser -> cleaner -> chunker -> embedder -> vector writer.
- Retrieval flow: query embedding -> vector search -> keyword search -> hybrid search -> metadata filter -> reranker -> context builder -> answer generator.
- Store citations with enough metadata for the frontend to show document, chunk, content, and score.
- Do not let the LLM decide which knowledge base can be accessed.

## MCP Rules

- Backend acts as MCP host/client. Agents consume MCP through `AgentTool`, not through raw MCP SDK details.
- Add MCP servers through `McpServerConfig`.
- Enforce `allowedTools`, `deniedTools`, timeout, argument validation, and user permissions before each tool call.
- Keep adapters in `src/mcp/adapters` so agent code stays decoupled from MCP SDK/client details.

## Database Rules

- Prefer Prisma/PostgreSQL patterns under `src/database`.
- Repositories must include tenant and brand scope where relevant.
- Do not build SQL by unsafe string concatenation.
- SQL generated by agents must pass read-only validation and backend scope injection before execution.
- Keep migrations under `src/database/prisma/migrations`.

## Commands

`apps/api/package.json` currently exposes these scripts:

```bash
pnpm --filter @yomedia/api-server dev
pnpm --filter @yomedia/api-server build
pnpm --filter @yomedia/api-server start
```

## Change Discipline

- Preserve the existing `apps/api` folder boundaries unless the user asks for a migration.
- Do not delete or rewrite unrelated legacy server/frontend files while working on `apps/api`.
- Prefer small, buildable increments. After adding or changing TypeScript files, run the backend build unless a dedicated type-check script is added later.
- If a dependency is needed, add it to `apps/api/package.json` and refresh the workspace lockfile with pnpm instead of editing lockfiles manually.

## Best Practices

- Start from the tRPC router and trace into `modules` before changing behavior.
- Keep services independent from Express/tRPC transport details.
- Keep repositories free of UI concerns and responsible only for persistence access.
- Add schemas before accepting new input. Add DTOs before returning new frontend data shapes.
- Keep agent, RAG, MCP, and SQL execution auditable through typed context, permission checks, and traceable steps.
- Prefer explicit errors from shared error classes over raw provider or database errors.

## Related Documents

- `docs/architecture/system.md`
- `docs/architecture/frontend.md`
- `docs/architecture/ai-agent.md`
- `docs/architecture/rag.md`
- `docs/data/database.md`
- `docs/data/migration.md`
- `docs/standards/coding.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
