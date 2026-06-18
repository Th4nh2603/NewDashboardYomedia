# Troubleshooting

## Purpose

Provide practical troubleshooting notes for common local and CI issues in this repository.

## Scope

This document covers dependencies, ports, database connection, migrations, Docker, TypeScript builds, frontend/API connectivity, and RAG or AI agent issues.

## Dependency Issues

Signs:

- `pnpm install` fails.
- Workspace packages are not linked.
- Expo emits npm config warnings.

Likely causes:

- Wrong package manager.
- pnpm version mismatch.
- Stale `node_modules`.

Resolution:

```bash
pnpm install
```

Use pnpm for workspace commands. Do not switch to npm, yarn, or bun without a project migration.

## Port Issues

Signs:

- Vite cannot bind port `3000`.
- API cannot bind port `4000`.
- nginx cannot bind port `80`.

Likely causes:

- Another process is already listening.
- Docker container is still running.

Resolution:

- Stop the conflicting process or container.
- For Vite, `apps/web/vite.config.ts` supports `VITE_DEV_PORT`.
- For API, set `PORT`.

## Database Connection Issues

Signs:

- Backend database calls fail.
- Prisma cannot connect.
- `DATABASE_URL` is empty.

Likely causes:

- `DATABASE_URL` is missing.
- PostgreSQL is not running or not reachable.
- Credentials or database name are wrong.

Resolution:

- Set `DATABASE_URL` for the API environment.
- Confirm PostgreSQL is reachable.
- Confirm repository code receives tenant and brand scope before querying.

## Migration Issues

Signs:

- Prisma migrate command is unavailable.
- Migration fails against PostgreSQL.
- Schema and generated client are out of sync.

Likely causes:

- Prisma CLI is not installed or not wired into scripts.
- `DATABASE_URL` points to the wrong database.
- Migration SQL is destructive or incompatible.

Resolution:

- See `docs/data/migration.md`.
- Verify migration tooling before adding scripts.
- Do not edit migrations that have already run in production.

## Docker Issues

Signs:

- Compose starts but web is unreachable.
- nginx returns gateway errors.
- Dependency install repeats on each container start.

Likely causes:

- Bind mount hides container-installed dependencies.
- `web` service failed to start.
- nginx cannot reach `web:3000`.

Resolution:

```bash
docker compose logs web
docker compose logs nginx
```

Use `docker-compose.dev.yml` for web-only development. Current compose files do not start API or PostgreSQL.

## TypeScript Build Issues

Signs:

- `pnpm --filter nova-ai-creative-suite lint` fails.
- `pnpm --filter @yomedia/api-server build` fails.

Likely causes:

- tRPC contract mismatch.
- Unknown response types.
- Missing package exports.
- Backend code importing transport or database layers incorrectly.

Resolution:

- Fix type errors rather than suppressing them.
- Run `pnpm check:architecture` for boundary violations.
- Keep tRPC procedures and backend DTOs aligned with frontend callers.

## Frontend Calling API Issues

Signs:

- Browser requests fail.
- `/api/trpc/...` on `localhost:3000` returns 404.
- Authenticated routes behave as unauthenticated.
- Chat or admin pages receive unexpected response shapes.

Likely causes:

- API server is not running.
- API origin config is wrong.
- Auth headers are missing.
- The web dev server was started before the Vite proxy config was loaded.
- Frontend and backend contracts are out of sync.

Resolution:

- Start API with `pnpm --filter @yomedia/api-server dev`.
- Start web with `pnpm --filter nova-ai-creative-suite dev`.
- Restart the web dev server after changing `apps/web/vite.config.ts`.
- Confirm API health at `http://localhost:4000/health`.
- Check `apps/web/src/api` helpers and matching tRPC routers.

## RAG Or AI Agent Issues

Signs:

- RAG answer lacks citations.
- Agent calls an unexpected tool.
- Tool request is denied.
- Provider call fails.

Likely causes:

- Tenant/brand filters removed all retrieval candidates.
- Tool is not allowlisted or user lacks permission.
- Provider key is missing.
- Prompt injection guard or output validation rejected the result.

Resolution:

- Check `docs/architecture/ai-agent.md` and `docs/architecture/rag.md`.
- Run `pnpm eval:rag` or `pnpm eval:agents`.
- Confirm backend environment variables for providers are set outside source control.
- Inspect sanitized agent step logs without exposing private prompts or documents.

## Related Documents

- `docs/operations/local-development.md`
- `docs/operations/deployment.md`
- `docs/data/migration.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
