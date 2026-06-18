# Database Migration Skill

## Purpose

Plan and review database schema, migration, repository, transaction, and index changes for the PostgreSQL-backed backend.

## When To Use

Use this skill when changing Prisma schema files, migrations, repositories, database clients, seed data, transaction behavior, indexes, or tenant/brand scoped queries.

## Required Files To Inspect

- `AGENTS.md`
- `apps/api/AGENTS.md`
- `docs/data/database.md`
- `docs/data/migration.md`
- `docs/standards/security.md`
- `apps/api/src/database/prisma/schema.prisma`
- Relevant repository, service, policy, and schema files
- `PLANS.md` for migration planning

## Workflow

1. Identify affected tables, relations, indexes, and scoped query paths.
2. Plan migration, rollback, backfill, and lock-risk handling.
3. Ensure tenant and brand columns and indexes support authorization filters.
4. Keep database access inside repositories.
5. Use transactions for multi-step writes.
6. Update docs and tests/evals when data contracts affect RAG, agents, or frontend DTOs.
7. Run backend build and architecture checks.

## Validation Commands

```bash
pnpm --filter @yomedia/api-server build
pnpm check:architecture
pnpm verify:changed
```

## Prohibited Actions

- Do not run destructive migrations automatically.
- Do not bypass repositories from services, routers, or frontend code.
- Do not fetch broad tenant data and filter it later.
- Do not concatenate client or model text into SQL.
- Do not remove data or indexes without documenting why.

## Completion Checklist

- [ ] Migration and rollback considered.
- [ ] Tenant and brand filters are explicit.
- [ ] Index impact reviewed.
- [ ] Repository boundary preserved.
- [ ] Transaction needs reviewed.
- [ ] Relevant commands run and results recorded.

## Result Report Format

- Schema or repository areas reviewed:
- Migration status:
- Rollback notes:
- Validation commands run:
- Remaining TODOs:
