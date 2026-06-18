# Local Development

## Purpose

Document the local setup and development commands for the current pnpm workspace.

## Scope

This document covers local environment requirements, dependency installation, frontend/API/mobile commands, environment variables, Docker development, and available checks.

## Environment Requirements

- Node.js compatible with the workspace and Docker images. The workflows and Docker files use Node 22.
- pnpm `10.26.1`, declared in root `package.json`.
- Git.
- Docker and Docker Compose if using the compose workflows.
- PostgreSQL access when running database-backed backend features.

## Package Manager

This repository uses pnpm. Do not switch package managers without an explicit project migration.

```bash
pnpm install
```

## Running The Frontend And API

Root script:

```bash
pnpm dev
```

The root script starts the API server and the web dev server together.

Direct web script:

```bash
pnpm --filter nova-ai-creative-suite dev
```

The Vite dev server is configured for port `3000`.

In development, web tRPC requests use same-origin `/api/trpc` and the Vite
proxy forwards them to the API server on `http://localhost:4000/trpc`.

## Running The API

```bash
pnpm --filter @yomedia/api-server dev
```

The API environment config defaults `PORT` to `4000`.

## Running The Mobile App

```bash
pnpm --filter mobile start
pnpm --filter mobile android
pnpm --filter mobile ios
pnpm --filter mobile web
```

## Running The Workspace

The root `pnpm dev` starts the API and web packages together. Mobile remains a
separate command because Expo needs an interactive target selection workflow.

## Environment Variables

Frontend example:

```text
apps/web/.env.example
VITE_CLERK_PUBLISHABLE_KEY=...
```

Backend config reads:

```text
NODE_ENV
PORT
DATABASE_URL
CLERK_SECRET_KEY
CLERK_JWT_KEY
CLERK_AUTHORIZED_PARTIES
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
```

For Clerk login checks, start both the web and API dev servers and set
`CLERK_SECRET_KEY` in the API environment. `CLERK_AUTHORIZED_PARTIES` should
include the local web origin, for example `http://localhost:3000`.

Do not commit real `.env`, `.env.local`, tokens, API keys, private prompts, or credentials.

## Docker Development

`docker-compose.dev.yml` starts the web app in a Node 22 Alpine container on port `3000`.

```bash
docker compose -f docker-compose.dev.yml up
```

`docker-compose.yml` starts the web service and an nginx proxy on port `80`.

```bash
docker compose up
```

The current compose files do not start the API or PostgreSQL.

## Lint, Typecheck, Build, Test, Eval

```bash
pnpm --filter nova-ai-creative-suite lint
pnpm --filter nova-ai-creative-suite build
pnpm --filter @yomedia/api-server build
pnpm --filter mobile lint
pnpm check:architecture
pnpm eval
pnpm verify
pnpm verify:changed
```

The root `pnpm test` command is currently a placeholder and exits with an error.

## Related Documents

- `README.md`
- `AGENTS.md`
- `docs/operations/troubleshooting.md`
- `docs/operations/deployment.md`
- `docs/standards/testing.md`
