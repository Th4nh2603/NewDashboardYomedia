# Database Migrations

## Purpose

Document the database migration workflow and review expectations for the PostgreSQL database used by `apps/api`.

## Scope

This document applies to Prisma schema and migration work under `apps/api/src/database/prisma`, backend repositories, database-related deployment work, and pull requests that change persistent data shape.

## Current Migration Tooling

The repository currently contains a Prisma schema at:

```text
apps/api/src/database/prisma/schema.prisma
```

The schema declares:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The backend environment config reads `DATABASE_URL` from `process.env.DATABASE_URL` in `apps/api/src/config/env.ts`.

TODO: Verify against implementation whether Prisma CLI commands are already wired into package scripts. `apps/api/package.json` currently exposes `dev`, `build`, and `start`, but no migration scripts.

## Migration Structure

Expected Prisma migration structure when migrations are added:

```text
apps/api/src/database/prisma/
  schema.prisma
  migrations/
    <timestamp>_<name>/
      migration.sql
```

The repository currently has the schema path documented, but migration folders may not exist yet.

## Creating A Migration

Until package scripts are added, use Prisma commands intentionally from the API package context after confirming the project has the required Prisma dependency installed:

```bash
pnpm --filter @yomedia/api-server exec prisma migrate dev --schema src/database/prisma/schema.prisma --name <migration-name>
```

If this command fails because Prisma CLI is not installed, add migration tooling deliberately in a separate change. Do not hand-write production migration files unless the team has chosen that workflow.

## Running Migrations Locally

Expected local workflow once migration tooling is present:

```bash
pnpm --filter @yomedia/api-server exec prisma migrate dev --schema src/database/prisma/schema.prisma
```

Set `DATABASE_URL` before running migrations. Do not point local migration commands at production.

## Running Migrations In Deployment

Expected deployment workflow once migration tooling is present:

```bash
pnpm --filter @yomedia/api-server exec prisma migrate deploy --schema src/database/prisma/schema.prisma
```

Run deployment migrations as an explicit deploy step before starting the new backend version.

## Rollback

Prisma does not provide automatic down migrations for every migration. Rollback must be planned per change:

- Prefer forward fixes for already-applied production migrations.
- Keep database backups or snapshots before risky migrations.
- Document manual rollback SQL only when it is tested and safe.
- Coordinate app rollback with schema compatibility.

## Production Safety Rules

- Do not edit a migration that has already run in production.
- Do not run destructive migrations automatically from `pnpm verify`, CI, or local review scripts.
- Review data loss, lock risk, backfill strategy, indexes, tenant scope, brand scope, and rollback before merge.
- Keep tenant and brand filtering compatible with old and new app versions during deploy.

## Pre-Merge Checks

Before merging database changes:

```bash
pnpm --filter @yomedia/api-server build
pnpm check:architecture
```

Also inspect generated migration SQL manually for destructive changes, missing indexes, broad table locks, and tenant/brand filtering impact.

## Related Documents

- `docs/data/database.md`
- `docs/architecture/backend.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `skills/database-migration/SKILL.md`
