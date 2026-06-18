# Frontend Validation Skill

## Purpose

Validate React + Vite frontend changes in `apps/web` for UI-only responsibilities, accessibility, browser behavior, API usage, and build correctness.

## When To Use

Use this skill when changing routes, components, hooks, forms, dashboard UI, chatbot UI, styles, Vite config, frontend API clients, or visible UX behavior.

## Required Files To Inspect

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/frontend.md`
- `docs/standards/coding.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `apps/web/package.json`
- Changed files under `apps/web/src`
- Related backend contracts or routers when API behavior changes

## Workflow

1. Confirm the frontend change is UI-only.
2. Check that data access uses tRPC or existing API helpers.
3. Verify no backend services, database clients, AI providers, MCP clients, RAG pipelines, or secrets are imported.
4. Review loading, empty, error, disabled, and success states.
5. Review accessibility: labels, keyboard paths, focus states, and accessible names.
6. Validate responsive behavior in desktop and mobile browser widths for visible changes.
7. Run relevant commands.

## Validation Commands

```bash
pnpm --filter nova-ai-creative-suite lint
pnpm --filter nova-ai-creative-suite build
pnpm check:architecture
```

## Prohibited Actions

- Do not add backend business logic to React components or hooks.
- Do not add direct database, AI provider, MCP, SQL, RAG, or server-secret access.
- Do not trust client-side tenant or brand scope for authorization.
- Do not remove existing UI behavior without explaining why.

## Completion Checklist

- [ ] UI remains browser-safe.
- [ ] API calls use approved clients.
- [ ] Loading and error states are handled.
- [ ] Accessibility checked.
- [ ] Browser validation completed for visible changes.
- [ ] Relevant commands run and results recorded.

## Result Report Format

- UI areas changed:
- Browser/accessibility validation:
- Validation commands run:
- Remaining TODOs:
