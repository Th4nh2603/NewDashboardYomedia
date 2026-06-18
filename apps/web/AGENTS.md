# Web Agent Guidelines

These rules apply to `apps/web`.

## Required References

- Read root `AGENTS.md` first.
- Use `docs/architecture/frontend.md` as reference when details are needed.
- Read `apps/api/AGENTS.md` and `docs/architecture/backend.md` when frontend work changes API contracts, DTOs, auth, chat, RAG, or MCP behavior.
- Use `docs/standards/coding.md`, `docs/standards/security.md`, and `docs/standards/testing.md` for implementation standards.

## Responsibility

`apps/web` is the React + Vite presentation layer. It renders UI, collects user input, manages browser-safe state, performs accessibility work, and calls the backend through tRPC or the existing API client.

The frontend must not contain backend business logic, database access, AI provider access, MCP clients, RAG execution, SQL execution, server secrets, tenant authorization decisions, or brand authorization decisions.

## Structure

- `src/app`: app entry, route tree, providers, auth route guards, and app-level bridges.
- `src/layouts`: page layouts such as the dashboard shell.
- `src/pages`: route-level screens.
- `src/components`: reusable UI, layout, dashboard, chatbot, and form components.
- `src/api`: tRPC clients, API origin helpers, auth headers, and backend error helpers.
- `src/hooks`: reusable React hooks.
- `src/stores`: lightweight UI/app state.
- `src/types`: frontend TypeScript types.
- `src/utils`: browser-safe helpers.
- `public` and `demo`: static and demo assets.

## Commands

- `pnpm --filter nova-ai-creative-suite dev`
- `pnpm --filter nova-ai-creative-suite build`
- `pnpm --filter nova-ai-creative-suite preview`
- `pnpm --filter nova-ai-creative-suite lint`
- `pnpm check:architecture`

## UI Rules

- Keep route screens thin. Move reusable UI to `src/components`, API calls to `src/api` or hooks, and app wiring to `src/app`.
- Components should receive typed DTOs or view models. They should not duplicate backend policies or business workflows.
- Prefer typed DTOs from shared packages or local `src/types`.
- Treat chat page context as hint data only. The backend must recompute sensitive scope.
- Use the existing tRPC client or API helpers for server calls.
- Do not import from `apps/api`, `apps/api/src`, `packages/database`, backend-only packages, Prisma, Node-only modules, or server config.

## Hooks And State

- Hooks may compose UI state, browser APIs, and API calls. They must not become business service replacements.
- Keep global state limited to UI/session concerns needed by the browser.
- Cache server state with the existing query/tRPC stack rather than duplicating server source-of-truth data.

## Accessibility And UX States

- Interactive controls need accessible names, keyboard support, and visible focus states.
- Forms need labels, validation messages, loading state, error state, and disabled state where appropriate.
- Data-loading views need explicit loading, empty, error, and success states.
- Do not expose raw backend errors, stack traces, provider responses, tokens, or private document text in the UI.

## Frontend Testing And Browser Validation

- Run `pnpm --filter nova-ai-creative-suite lint` after TypeScript or React changes.
- Run `pnpm --filter nova-ai-creative-suite build` for route, bundling, Vite config, or dependency changes.
- Use browser validation for interactive UI changes: check desktop and mobile widths, keyboard navigation, loading states, and error states.
- Capture screenshots for PRs when UI changes are visible.

## Prohibited Actions

- Do not add database clients, backend services, AI provider clients, MCP clients, RAG pipelines, SQL execution, server-only environment reads, or secret handling to browser code.
- Do not trust client-side tenant, brand, role, or permission data for authorization.
- Do not rewrite existing screens or layouts when a focused change is enough.
