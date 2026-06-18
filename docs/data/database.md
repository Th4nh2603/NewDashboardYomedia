# Database

## Purpose

Describe database ownership, schema expectations, repository boundaries, transactions, migrations, indexing, and tenant/brand filtering.

## Scope

This document applies to PostgreSQL and backend database access under `apps/api/src/database`, repository code under `apps/api/src/modules`, and database-related RAG storage concerns.

## Ownership

The backend owns database access. Current database files live in `apps/api/src/database`, with Prisma schema material under `apps/api/src/database/prisma`. Frontend and mobile apps must not access the database directly.

## Schema Conventions

- Include tenant identifiers on tenant-owned records.
- Include brand identifiers where brand permissions apply.
- Use explicit timestamps for auditable records.
- Prefer stable IDs and unique constraints that match business rules.
- Model document, chunk, embedding, and citation metadata explicitly for RAG.

## Repository Pattern

Repositories own persistence. Services call repositories and pass scoped, validated inputs. tRPC routers and controllers must not import database clients directly.

## Transactions

Use transactions for multi-step writes that must succeed or fail together, such as document ingestion metadata plus chunk writes, permission updates, and administrative bulk changes.

## Migrations

Migrations should be reviewed for data loss, lock risk, index build time, rollback strategy, and tenant/brand impact. Do not run destructive migrations automatically from verification scripts.

See `docs/data/migration.md`.

## Indexes

Index tenant and brand scoped query columns. RAG vector and metadata queries should support tenant and brand prefiltering before ranking.

## Tenant And Brand Filtering

Tenant and brand filters must be explicit in repository methods. Do not fetch broad result sets and filter protected data in frontend code or after answer generation.

## Connection Management

Database clients should be created in backend infrastructure code and reused according to the ORM/client guidance. Avoid per-request connection creation unless the database layer explicitly supports it.

## Test Database Strategy

Use disposable databases for repository and integration tests when test infrastructure exists. Seed fixtures for multiple tenants and brands to catch leakage.

## Related Documents

- `docs/data/migration.md`
- `docs/architecture/backend.md`
- `docs/architecture/rag.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
