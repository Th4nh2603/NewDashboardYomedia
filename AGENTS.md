# Repository Guidelines

This is the required entrypoint for Codex and other AI agents working in this repository. App-specific `AGENTS.md` files add rules for their own directory scope.

## Project Purpose

NewDashboardYomedia is an internal YoMedia fullstack monorepo for creative operations, demo management, dashboard workflows, authenticated administration, AI chat, RAG-backed document answers, multi-agent orchestration, and MCP tool integrations.

## Scope Order

1. Read this file before any change.
2. If editing `apps/web`, also read `apps/web/AGENTS.md`.
3. If editing `apps/api`, also read `apps/api/AGENTS.md`.
4. If editing `apps/api/src/ai`, also read `apps/api/src/ai/AGENTS.md`.
5. If editing `apps/api/src/rag`, also read `apps/api/src/rag/AGENTS.md`.
6. If editing `apps/mobile`, also read `apps/mobile/AGENTS.md`.
7. Use files under `docs/` as reference material only. They do not replace `AGENTS.md`.

## Repository Map

- `apps/web`: React + Vite dashboard frontend. UI only.
- `apps/api`: Express + tRPC backend. Business logic, auth, database access, AI, RAG, MCP, and DTO assembly live here.
- `apps/mobile`: Expo mobile app.
- `packages/api`: shared API contract and transformer helpers currently consumed by web.
- `packages/shared`: shared workspace utilities and types.
- `packages/contracts`: intended home for shared input and output schemas as contracts are extracted.
- `packages/database`: intended home for shared database primitives when backend persistence is promoted out of `apps/api`.
- `packages/auth`: intended home for shared auth contracts and policy types.
- `packages/ai`, `packages/rag`, `packages/agents`: intended homes for extracted AI/RAG/agent contracts or reusable backend-only helpers.
- `packages/observability`: shared observability contracts, including agent execution log shapes.
- `packages/test-utils`: intended home for reusable deterministic test utilities.
- `docs`: grouped architecture, standards, data, and operations reference docs.
- `scripts`: local verification and Codex review scripts.
- `evals`: deterministic and optional model-based evaluation fixtures.
- `skills`: project-specific Codex skills.

## Important Documentation

- `PLANS.md`: required template for non-trivial changes.
- `docs/README.md`: documentation index and task-based reading guide.
- `docs/architecture/system.md`: system architecture and diagrams.
- `docs/architecture/frontend.md`: frontend structure and UI-only rules.
- `docs/architecture/backend.md`: backend API structure and module rules.
- `docs/architecture/ai-agent.md`: multi-agent, MCP, SQL, trace, and approval guidance.
- `docs/architecture/rag.md`: ingestion, retrieval, citations, and RAG evaluation guidance.
- `docs/standards/coding.md`: TypeScript, import, validation, logging, and layering standards.
- `docs/standards/testing.md`: test strategy by layer.
- `docs/standards/security.md`: auth, authorization, tenant isolation, prompt injection, and logging rules.
- `docs/standards/code-review.md`: Codex review checklist.
- `docs/data/database.md`: repository, transaction, index, and tenant filtering guidance.
- `docs/data/migration.md`: migration workflow and safety guidance.
- `docs/operations/local-development.md`: local setup and command reference.
- `docs/operations/deployment.md`: deployment guidance.
- `docs/operations/troubleshooting.md`: common issue diagnosis.

## Actual Commands

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run the API and web dev servers through the root script.
- `pnpm verify`: run the local verification script.
- `pnpm verify:changed`: run targeted changed-file verification where possible.
- `pnpm check:architecture`: run architecture checks.
- `pnpm codex:review`: run the Codex review workflow.
- `pnpm eval`: run deterministic eval checks.
- `pnpm eval:rag`: run deterministic RAG eval checks.
- `pnpm eval:agents`: run deterministic agent eval checks.
- `pnpm test`: placeholder only; currently exits with an error.
- `pnpm --filter nova-ai-creative-suite dev`: run web dev server on port `3000`.
- `pnpm --filter nova-ai-creative-suite build`: build web.
- `pnpm --filter nova-ai-creative-suite preview`: preview built web.
- `pnpm --filter nova-ai-creative-suite lint`: run web TypeScript check.
- `pnpm --filter @yomedia/api-server dev`: run backend dev server.
- `pnpm --filter @yomedia/api-server build`: build backend TypeScript.
- `pnpm --filter @yomedia/api-server start`: run built backend.
- `pnpm --filter mobile start`: start Expo.
- `pnpm --filter mobile android`: start Expo for Android.
- `pnpm --filter mobile ios`: start Expo for iOS.
- `pnpm --filter mobile web`: start Expo for web.
- `pnpm --filter mobile lint`: run Expo lint.

Do not document or rely on commands that are not present in `package.json` or this file.

## Mandatory Development Workflow

1. Inspect `git status --short` before editing.
2. Read all applicable `AGENTS.md` files.
3. Inspect the relevant existing source and package scripts before changing files.
4. Use `PLANS.md` for multi-file, architectural, security-sensitive, database, RAG, or agent changes.
5. Keep changes scoped. Do not rewrite or move production code unless the task requires it.
6. Update docs when commands, package names, responsibilities, or architecture change.
7. Run available checks that match the changed areas.
8. Inspect `git diff --check` and `git diff` before completion.
9. Do not claim tests passed unless the commands were actually executed.

## Architecture Constraints

- The project architecture source of truth for agent work is:
  Backend Trusted Scope -> Agent Runtime Core -> Unified Policy Gate -> RAG Service / SQL Safety / Shared Tool Gate -> Tool Executor -> HITL Approval -> Response + Observability -> Data Layer / Persistence.
- Chat flow must go through Chat API, AgentContextBuilder, Agent Runtime Core, PolicyGate, ToolGateway, ToolExecutor, and response normalization.
- Agents must not call backend tools directly. They request tool calls through the shared ToolGateway only.
- The Application Database is the primary app persistence boundary for users, tenants, brands, roles, permissions, sessions, configs, chat sessions/messages, agent runs, tool runs, pending approvals, approval history, and persisted memory summaries.
- RAG must query a Vector DB / Knowledge Store for documents, chunks, embeddings, metadata, and citations. If implemented with PostgreSQL and `pgvector`, still treat it as a knowledge store/vector index boundary.
- SqlAgent must never query databases directly. SQL access must flow through Agent Runtime Core, Unified Policy Gate, SQL Safety, then the Business / Report Database with read-only controls, allowlists, row limits, timeouts, and tenant/brand filters.
- Sanitized step logs, audit logs, tool runs, policy decisions, result sanitation records, and errors must be persisted to a Log / Audit Store.
- SFTP Service / Remote Demo Storage is backend-only remote file/demo storage, not the Application Database, Knowledge Store, Business / Report Database, or Log / Audit Store.
- Do not introduce MCP for the merged agent core refactor. Keep existing MCP code isolated until a future explicit migration.
- Do not delete `scoring.ts` if it exists; keep it for backward compatibility or comparison.
- Destructive SFTP tools require HITL approval by default. Read-only SFTP tools usually do not require approval.
- HITL approval state and audit records must be durable and sanitized; do not use in-memory-only approval state for production flows.
- Approved execution must revalidate `PolicyGate` before `ToolExecutor`.
- Frontend components must not contain business logic.
- Business logic belongs in backend services.
- Express controllers and tRPC procedures must remain thin.
- Services must not depend directly on Express `Request` or `Response` objects.
- Database access must go through repositories.
- Shared input and output schemas belong in the contracts package when shared across apps.
- Validate external input with the validation library already used by the project. This repository currently uses Zod.
- Agents must access external systems through approved tools.
- RAG responses must preserve document metadata and citations.
- Tenant and brand authorization must be applied before database queries and RAG retrieval.
- Never expose secrets, tokens, passwords, private prompts, or private document contents in logs.
- MCP tools must be allowlisted and authorized before execution.
- SQL or database-writing agents require explicit policy controls and audit logging.

## Security Requirements

- Do not commit `.env`, `.env.local`, credentials, API keys, exported private data, private prompts, or confidential documents.
- Derive tenant, brand, role, and permission scope from authenticated backend context.
- Treat client-provided scope as untrusted hints only.
- Redact sensitive values from logs and agent traces.
- Use parameterized database access through repositories.
- Apply rate limits and tool authorization for external system calls.
- RAG retrieval must filter by tenant and brand before ranking or answer generation.

## Merged Agent Core Ownership

- Chat API owns request validation and the `ChatResponseDto` boundary.
- AgentContextBuilder owns trusted runtime context: user, tenant, brand, KB, tool scope, permissions, and session context.
- Agent Runtime Core owns orchestration, intent detection, scoped memory, skill catalog loading, registry checks, system prompt construction, agent loop, and final answer assembly.
- Agent Registry owns the allowlist for `RagAgent`, `SqlAgent`, `GeneralAgent`, and `DemoAgent`.
- Unified Policy Gate owns argument validation, permission checks, tenant/brand/KB scope checks, safety envelope checks, and approval decisions.
- Shared Tool Gate owns tool registry lookup, tool name validation, input schema validation, policy invocation, approval handoff, and result sanitization.
- Tool Executor owns timeout, retry, abort-signal-ready execution, rate-limit/idempotency hooks, and error mapping.
- SFTP Service owns remote demo storage access and backend-only credentials.
- Approval module owns pending, approved, rejected, expired, executed, and failed lifecycle states.
- Observability owns sanitized step logs, durable audit logs, and memory summaries.
- Frontend owns UI only: chat input/output, step viewer, pending approval display, demo SFTP browser, and activity log.

## Before Changing Code Checklist

- Identify whether the change touches frontend, backend, tools, policy, approval, RAG, SQL, SFTP, or docs.
- Check tenant, brand, and KB scope before data access or retrieval.
- Check whether the action needs HITL approval.
- Check whether logs, traces, tool results, and approval summaries need sanitizing.
- Check whether approval and audit state must be persisted durably.
- Check whether `AGENTS.md` or architecture docs need updates.
- Run the relevant tests, typecheck, build, and architecture checks that match the touched area.

## Definition Of Done

- The change is scoped to the requested behavior.
- Architecture boundaries are preserved.
- Inputs are validated at trust boundaries.
- Auth, tenant, and brand authorization are enforced before protected data access.
- Errors are user-safe and logs are operator-useful without leaking secrets.
- Relevant docs, evals, and scripts are updated when behavior or workflow changes.
- Available lint, typecheck, build, tests, architecture checks, and deterministic evals have been run or explicitly reported as unavailable.
- `git status --short`, `git diff --check`, and `git diff` have been inspected.

## Prohibited Actions

- Do not delete or rewrite existing application code unnecessarily.
- Do not remove existing files unless they are clearly obsolete and the reason is documented.
- Do not move large production code areas just to match a proposed structure.
- Do not add fake implementations that appear functional but do nothing.
- Do not bypass failures by deleting tests, weakening TypeScript, globally disabling lint rules, adding broad `any`, ignoring errors, or adding unconditional skip flags.
- Do not put backend secrets, database clients, AI provider clients, MCP clients, RAG execution, SQL execution, or authorization decisions in frontend code.
- Do not log passwords, access tokens, refresh tokens, API keys, confidential documents, private user data, or unredacted prompts containing sensitive data.

## Commits And PRs

Recent history uses concise conventional-style commits such as `feat: ...`, `fix(chat): ...`, and `fix(server): ...`. Keep commits scoped and imperative. PRs should include summary, affected areas, validation commands, linked issues when relevant, and screenshots for UI changes.
