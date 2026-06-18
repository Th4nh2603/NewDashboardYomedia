# NewDashboardYomedia

Internal YoMedia dashboard monorepo for creative operations, demo management, AI-assisted workflows, and future backend orchestration.

## Repository Layout

```text
NewDashboardYomedia/
+-- apps/
|   +-- web/       # React + Vite dashboard UI
|   +-- api/       # Express + tRPC backend skeleton
|   +-- mobile/    # Expo mobile app
+-- packages/
|   +-- api/       # Shared tRPC/client contract helpers
|   +-- shared/    # Shared workspace utilities and types
|   +-- contracts/ # Reserved shared Zod/API contracts
|   +-- observability/ # Shared sanitized observability contracts
+-- docs/
|   +-- README.md
|   +-- architecture/
|   |   +-- system.md
|   |   +-- frontend.md
|   |   +-- backend.md
|   |   +-- ai-agent.md
|   |   +-- rag.md
|   +-- standards/
|   |   +-- coding.md
|   |   +-- security.md
|   |   +-- testing.md
|   |   +-- code-review.md
|   +-- data/
|   |   +-- database.md
|   |   +-- migration.md
|   +-- operations/
|       +-- local-development.md
|       +-- deployment.md
|       +-- troubleshooting.md
+-- scripts/       # Verification, architecture, eval, and Codex review scripts
+-- evals/         # Deterministic AI/RAG/agent eval fixtures and Promptfoo starter config
+-- skills/        # Project-specific Codex skills
+-- .codex/        # Safe project-level Codex configuration
+-- AGENTS.md      # Contributor guide for agents and humans
+-- PLANS.md       # Execution plan template
```

## Apps

### `apps/web`

React 19, Vite, TypeScript, React Router, TanStack Query, tRPC client, Clerk, Zod, and React Hook Form.

The web app is the presentation layer. It should render backend DTOs, keep UI state, perform UX-level validation, and call API/tRPC clients. Do not move server-only concerns such as secrets, tenant scope, SQL, RAG, MCP, or authorization decisions into browser code.

### `apps/api`

Express + tRPC backend package named `@yomedia/api-server`.

The backend is the source of truth for authentication, authorization, tenant and brand scope, business logic, database access, chat orchestration, RAG, MCP tools, validation, guardrails, and response DTOs.

### `apps/mobile`

Expo app with file-based routes under `apps/mobile/app`, shared components under `components`, and assets under `assets`.

## Commands

Install dependencies:

```bash
pnpm install
```

Run the API on port `4000` and the web app on port `3000`:

```bash
pnpm dev
```

Run or build specific packages:

```bash
pnpm --filter nova-ai-creative-suite dev
pnpm --filter nova-ai-creative-suite build
pnpm --filter nova-ai-creative-suite lint

pnpm --filter @yomedia/api-server dev
pnpm --filter @yomedia/api-server build

pnpm --filter mobile start
pnpm --filter mobile lint
```

The root `pnpm test` command is currently a placeholder.

Codex engineering harness commands:

```bash
pnpm verify
pnpm verify:changed
pnpm check:architecture
pnpm codex:review
pnpm eval
pnpm eval:rag
pnpm eval:agents
```

The `.sh` files under `scripts/` are wrappers for Git Bash, WSL, Linux, and CI. The root package scripts call Node directly for Windows compatibility.

## Agent Documentation

Read documentation by scope before making changes:

1. `AGENTS.md`: required repo-level instructions.
2. `apps/web/AGENTS.md`: required when changing `apps/web`.
3. `apps/api/AGENTS.md`: required when changing `apps/api`.
4. `apps/mobile/AGENTS.md`: required when changing `apps/mobile`.
5. `docs/README.md`: documentation index. Files under `docs/` are reference material only; do not use docs files as replacements for `AGENTS.md`.

Keep these documents aligned when architecture, commands, package names, or folder boundaries change.

Use `PLANS.md` for non-trivial work, especially database, authorization, RAG, agent, MCP, or multi-app changes. Project-specific Codex skills live in `skills/` for frontend validation, API development, RAG evaluation, and database migration.

## Backend Safety Rules

- Never trust client-provided `tenantId`, `brandId`, roles, permissions, knowledge-base IDs, or MCP tool names.
- Derive sensitive scope from authenticated server context.
- Validate all API inputs with schemas before service execution.
- Return frontend-safe DTOs. Do not leak secrets, stack traces, raw provider responses, or raw database entities.
- Keep AI providers, database credentials, MCP clients, and SMTP/SFTP credentials on the backend.

## Frontend Rules

- Keep UI code browser-safe and secret-free.
- Prefer backend DTO rendering over duplicating business rules in React.
- Treat page context sent to chat as hints only. Backend must recompute sensitive scope.
- Keep reusable UI in `src/components`, route screens in `src/pages`, API clients in `src/api`, hooks in `src/hooks`, and app wiring in `src/app`.

## Environment

Do not commit `.env`, `.env.local`, credentials, API keys, or exported private data. Use app-specific env examples where available, such as `apps/web/.env.example`.

## License

Internal YoMedia project. Use according to organization policy.
