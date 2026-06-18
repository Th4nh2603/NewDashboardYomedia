# Web App

React + Vite dashboard frontend for NewDashboardYomedia.

## Commands

Run from the repository root:

```bash
pnpm --filter nova-ai-creative-suite dev
pnpm --filter nova-ai-creative-suite build
pnpm --filter nova-ai-creative-suite preview
pnpm --filter nova-ai-creative-suite lint
```

The dev server runs on port `3000`.

## Notes

- Follow `apps/web/AGENTS.md` before changing frontend code.
- Keep server-only concerns out of browser code.
- Use `apps/web/.env.example` as the environment variable reference.
