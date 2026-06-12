# Web App

Vite React dashboard for the Yomedia workspace.

## Source Layout

- `src/App.tsx` - route tree and top-level app providers.
- `src/main.tsx` - browser entry point.
- `src/components/` - reusable UI and layout components.
- `src/contexts/` - React context providers.
- `src/hooks/` - shared React hooks.
- `src/pages/` - route-level screens.
- `src/lib/` - API clients, utilities, form helpers, and feature support code.
- `src/data/` - static app data loaded by the web client.
- `src/config/` - app configuration used by the client.
- `public/` - files served directly by Vite.

Keep application source inside `src/`. Keep build, Docker, env, and Vite/TypeScript config files at the app root.

## Commands

```bash
pnpm --filter ./apps/web run dev
pnpm --filter ./apps/web run lint
pnpm --filter ./apps/web run build
```
