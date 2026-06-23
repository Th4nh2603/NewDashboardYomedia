# Deployment

## Purpose

Document the current build and deployment-relevant assets for the project.

## Scope

This document covers build commands, Docker Compose, nginx, server environment variables, database migration considerations, health checks, and basic rollback guidance.

## Build Commands

Frontend build:

```bash
pnpm --filter nova-ai-creative-suite build
```

Backend build:

```bash
pnpm --filter @yomedia/api-server build
```

Mobile builds are not documented in the current root deployment flow.

## Docker Compose

`docker-compose.yml` defines:

- `web`: Node 22 Alpine container, working directory `/app`, bind-mounted `./apps/web`, port `3000`, runs `pnpm dev`.
- `nginx`: nginx latest, port `80`, mounts `./nginx.conf`.

This compose file is development-oriented because it runs Vite dev mode instead of serving a production build.

TODO: Verify production deployment strategy. A production deployment should usually serve `apps/web/dist` and run the built API process separately.

## Nginx

`nginx.conf` proxies port `80` to the `web` service at `web:3000`, supports upgrade headers, and sets `client_max_body_size 512m`.

## Server Environment Variables

Backend config reads:

```text
NODE_ENV
PORT
DATABASE_URL
OPENAI_API_KEY
OPENAI_MODEL
ANTHROPIC_API_KEY
GEMINI_API_KEY
GEMINI_MODEL
```

Frontend Vite environment variables must use the `VITE_` prefix when exposed to browser code. The checked-in `apps/web/.env.example` contains `VITE_CLERK_PUBLISHABLE_KEY`.

Do not store production secrets in source control or `.codex/config.toml`.

## Database Migration During Deploy

The Prisma datasource is configured for PostgreSQL via `DATABASE_URL`.

Expected production migration command once Prisma migration tooling is wired:

```bash
pnpm --filter @yomedia/api-server exec prisma migrate deploy --schema src/database/prisma/schema.prisma
```

TODO: Verify against implementation before adding this command to CI/CD; no migration package script exists today.

## Health Check

The backend app includes Express composition and tRPC mount under `apps/api/src/app.ts`.

Use `GET /health` as the production load-balancer health path. The web app also
uses the public tRPC `health.check` procedure for same-origin `/api/trpc`
connectivity probes during local development and offline recovery.

## Basic Rollback

- Keep the previous deploy artifact or container image available.
- Roll back application code first when the database schema is backward compatible.
- For schema changes, use the rollback plan documented with the migration.
- Prefer forward-fix migrations for production schemas that have already changed.
- Confirm environment variables and secrets are compatible with the rolled-back version.

## Related Documents

- `docs/operations/local-development.md`
- `docs/operations/troubleshooting.md`
- `docs/data/migration.md`
- `docs/standards/security.md`
