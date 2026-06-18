# Frontend Architecture: apps/web

## Purpose

Describe how the React + Vite frontend is organized and what responsibilities are allowed in browser code.

## Scope

This document applies to `apps/web`, including routes, layouts, components, hooks, stores, API clients, browser-safe utilities, Vite configuration, and visible UI behavior.

Use this guide when changing the React/Vite frontend.

## Read Order

1. Read root `AGENTS.md` for repository-wide rules.
2. Read `apps/web/AGENTS.md` for mandatory frontend rules.
3. Use this file as reference for frontend structure and best practices.
4. Read `docs/architecture/backend.md` when a frontend change touches backend contracts, DTOs, authentication, chat, RAG, or MCP behavior.

## Architecture

- `apps/web` is the presentation layer only.
- Keep business logic, authorization decisions, tenant selection, SQL, RAG, agent selection, MCP calls, and secret-bearing integrations on the backend.
- The frontend may keep temporary UI state, validate inputs for user experience, call backend APIs/tRPC, and render loading, errors, tables, charts, citations, and agent steps.
- Do not add a `modules` folder for domain logic in the frontend. Organize UI by app shell, pages, layouts, components, API clients, hooks, stores, types, and utilities.

## Folder Map

- `src/app`: app entry component, route tree, providers, auth route guards, app-level bridges.
- `src/layouts`: page layouts such as the dashboard shell.
- `src/pages`: route-level screens.
- `src/components/common`: reusable UI primitives and shared widgets.
- `src/components/layout`: layout-support components such as sidebar/header helpers.
- `src/components/chatbot`: chat UI components and renderers.
- `src/components/dashboard`: dashboard, creative demo, and data-display widgets.
- `src/components/form`: form primitives.
- `src/api`: tRPC, API origin, auth headers, and backend error helpers.
- `src/hooks`: reusable React hooks.
- `src/stores`: lightweight UI/app state using React Context or a small store.
- `src/types`: shared frontend TypeScript types.
- `src/utils`: browser-side formatting, upload, demo, SFTP, and other frontend helper utilities.

## Rules

- Run the web app on port `3000`. Use `pnpm --filter nova-ai-creative-suite dev` or the equivalent Vite command with port `3000`.
- Prefer `@/` imports over deep relative imports for cross-folder references.
- Backend responses should arrive as clear DTOs; frontend code renders them without trusting client-supplied tenant, role, or brand claims.
- Never put OpenAI, Anthropic, Gemini, database, vector database, MCP, or other sensitive service calls directly in browser code.
- If page context is sent with chat requests, treat it as hint data only. The backend must authenticate, authorize, and recompute sensitive scope.
- Keep utility helpers browser-safe and free of secrets.

## Best Practices

- Keep route screens in `src/pages` thin; move reusable UI to `src/components` and data access to `src/api` or hooks.
- Prefer typed DTOs from shared packages or local `src/types` over ad hoc object shapes.
- Keep form validation close to forms for UX, but duplicate security validation on the backend.
- Render loading, empty, error, and denied-access states explicitly.
- When changing API usage, update the matching backend router/service or shared contract in the same change if needed.

## Related Documents

- `docs/architecture/system.md`
- `docs/architecture/backend.md`
- `docs/standards/coding.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
