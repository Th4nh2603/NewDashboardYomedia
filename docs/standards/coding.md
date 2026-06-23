# Coding Standards

## Purpose

Define coding conventions and architecture boundaries that keep the monorepo maintainable.

## Scope

These standards apply to TypeScript, React, Express, tRPC, backend modules, RAG, agents, MCP integration, scripts, and shared packages in this repository.

## Naming Conventions

- Use `PascalCase` for React components, classes, and exported types.
- Use `camelCase` for variables, functions, hooks, and service methods.
- Use `useThing` for React hooks.
- Use `*.service.ts`, `*.repository.ts`, `*.schema.ts`, `*.policy.ts`, `*.router.ts`, and `*.types.ts` for backend module files.
- Use explicit domain names such as `brandPolicy` or `knowledgeRepository` instead of generic names like `helper`.

## TypeScript Rules

- Keep `strict` TypeScript assumptions intact.
- Prefer precise domain types and Zod-inferred types over broad `any`.
- Avoid global type changes unless they are required by a shared integration.
- Keep frontend types browser-safe and backend types server-safe.
- Use ESM imports in packages configured as ESM.

## Import Rules

- Frontend may import from `src`, `packages/api`, `packages/shared`, and browser-safe contract packages.
- Frontend must not import from `apps/api`, `packages/database`, Prisma, Node-only modules, backend config, AI providers, MCP clients, or RAG pipelines.
- Backend routers may import schemas, middleware, services, and DTO helpers, but not database clients directly.
- Services may import repositories, policies, schemas, and backend utilities, but not Express `Request` or `Response`.
- Repositories may import database clients and persistence types.

## Layer Boundaries

- Components render UI and emit user intent.
- Hooks compose UI state, API calls, and browser-safe behavior.
- tRPC procedures validate input, derive context, call services, and return DTOs.
- Services implement business workflows.
- Policies implement authorization decisions.
- Repositories implement persistence.
- Agents orchestrate approved tools and services; they do not bypass authorization.

## Error Handling

- Use typed application errors for expected backend failures.
- Use `AppError` for expected backend failures and include a stable `code` when the frontend or operators need to branch on the error.
- Express handlers should pass failures to `errorMiddleware`; tRPC procedures should throw `TRPCError` or translate `AppError` to `TRPCError`.
- Unexpected backend failures should be logged with request ID, route/procedure, status/code, and sanitized summaries only.
- Map backend errors to frontend-safe messages.
- Preserve enough diagnostic context for operators without logging secrets or private data.
- Do not expose stack traces, provider internals, SQL details, raw prompts, or confidential document text to clients.
- Frontend route/component boundaries should show user-safe messages; detailed exception text is only appropriate in local development.

## Async Code

- Always await promises that must complete before returning.
- Use explicit timeouts for external provider, MCP, and long-running agent work.
- Keep retries bounded and log sanitized retry context.
- Avoid parallel database or tool work when authorization depends on a prior result.

## Validation

- Validate all external input at trust boundaries with Zod, the validation library already used in this repo.
- Reuse schemas from `packages/contracts` when inputs or outputs are shared across apps.
- Validate model output before using it as a tool call, repository filter, SQL-like operation, or final answer.

## Logging

- Prefer structured logs with request IDs, run IDs, user/tenant/brand identifiers where policy allows, durations, status, and sanitized summaries.
- Use `apps/api/src/shared/logger/logger.ts` instead of raw `console.*` in backend application code so metadata is sanitized consistently.
- Never log passwords, access tokens, refresh tokens, API keys, private prompts, full confidential documents, or unredacted private user data.
- Agent logs should summarize inputs and outputs rather than storing raw prompts or raw retrieved content.

## Comments

- Add comments when code has non-obvious policy, security, authorization, concurrency, or provider behavior.
- Avoid comments that restate the code.
- Keep TODOs specific and tied to missing project information or follow-up work.

## Size And Complexity

- Keep route handlers and tRPC procedures small.
- Split services when a file mixes unrelated workflows.
- Prefer small policy and repository methods with explicit inputs.
- Avoid adding abstractions until they remove real duplication or clarify a boundary already used by the project.

## Related Documents

- `docs/architecture/system.md`
- `docs/architecture/frontend.md`
- `docs/architecture/backend.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
