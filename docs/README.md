# Documentation Index

## Purpose

This directory contains reference documentation for NewDashboardYomedia. It is organized so developers and AI agents can quickly find architecture, standards, data, and operations guidance.

## Scope

Documentation is reference material. Mandatory agent instructions still live in `AGENTS.md` files. When documentation and `AGENTS.md` conflict, follow the applicable `AGENTS.md` and update documentation.

## Structure

```text
docs/
  architecture/
    system.md
    frontend.md
    backend.md
    ai-agent.md
    agent-core.md
    approval.md
    audit-log.md
    policy-gate.md
    tool-gate.md
    rag.md
    manage-demo-sftp.md
    sftp-demo.md
  standards/
    coding.md
    security.md
    testing.md
    code-review.md
  data/
    database.md
    migration.md
  operations/
    local-development.md
    deployment.md
    troubleshooting.md
  README.md
```

## Architecture

- `architecture/system.md`: high-level system architecture, diagrams, and ownership boundaries.
- `architecture/frontend.md`: React + Vite frontend structure and UI-only rules.
- `architecture/backend.md`: Express + tRPC backend structure, services, repositories, policies, and API rules.
- `architecture/ai-agent.md`: AI agent orchestration, routing, MCP, SQL, context, traces, and response contracts.
- `architecture/agent-core.md`: merged agent core architecture, backend trusted scope, stable agent branches, and runtime flow.
- `architecture/approval.md`: durable HITL approval lifecycle and approved execution flow.
- `architecture/audit-log.md`: durable sanitized audit record fields and restrictions.
- `architecture/policy-gate.md`: unified validation, permission, scope, safety envelope, and approval decision guidance.
- `architecture/tool-gate.md`: shared tool registry, gateway, executor, approval handoff, and result sanitization guidance.
- `architecture/rag.md`: RAG ingestion, retrieval, metadata, citations, insufficient-context handling, and eval metrics.
- `architecture/manage-demo-sftp.md`: Manage Demo and SFTP ownership, path, permission, operation, preview, and audit model.
- `architecture/sftp-demo.md`: backend-owned SFTP tool groups, credential boundaries, and read/write/destructive action rules.

## Standards

- `standards/coding.md`: TypeScript, import, layering, error handling, validation, logging, and complexity standards.
- `standards/security.md`: auth, authorization, tenant/brand isolation, secrets, prompt injection, tools, and logging restrictions.
- `standards/testing.md`: unit, integration, frontend, browser, authorization, tenant-isolation, RAG, and agent testing strategy.
- `standards/code-review.md`: Codex and PR review checklist.

## Data

- `data/database.md`: database ownership, schema conventions, repositories, transactions, indexes, and test database strategy.
- `data/migration.md`: Prisma/PostgreSQL migration workflow, rollback expectations, and pre-merge checks.

## Operations

- `operations/local-development.md`: environment requirements, pnpm commands, local services, env variables, Docker development, and checks.
- `operations/deployment.md`: build, Docker Compose, nginx, server env variables, migration deploy notes, health checks, and rollback.
- `operations/troubleshooting.md`: common dependency, port, database, migration, Docker, TypeScript, API, RAG, and agent issues.

## What To Read By Task

Frontend work:

- `architecture/frontend.md`
- `standards/coding.md`
- `standards/security.md`
- `standards/testing.md`

API work:

- `architecture/backend.md`
- `standards/coding.md`
- `standards/security.md`
- `standards/testing.md`

Database migration work:

- `data/database.md`
- `data/migration.md`
- `standards/security.md`

AI agent work:

- `architecture/agent-core.md`
- `architecture/approval.md`
- `architecture/audit-log.md`
- `architecture/policy-gate.md`
- `architecture/tool-gate.md`
- `architecture/ai-agent.md`
- `architecture/rag.md`
- `standards/security.md`
- `standards/testing.md`

Demo SFTP work:

- `architecture/sftp-demo.md`
- `architecture/manage-demo-sftp.md`
- `architecture/policy-gate.md`
- `architecture/tool-gate.md`
- `standards/security.md`

RAG work:

- `architecture/rag.md`
- `architecture/ai-agent.md`
- `data/database.md`
- `standards/security.md`

Local setup or deployment:

- `operations/local-development.md`
- `operations/deployment.md`
- `operations/troubleshooting.md`

Code review:

- `standards/code-review.md`
- `standards/coding.md`
- `standards/security.md`
- `standards/testing.md`

## Agent And Skill Guidance

- Frontend validation skill should read `architecture/frontend.md`, `standards/coding.md`, `standards/security.md`, and `standards/testing.md`.
- API development skill should read `architecture/backend.md`, `standards/coding.md`, `standards/security.md`, and `standards/testing.md`.
- Database migration skill should read `data/database.md`, `data/migration.md`, and `standards/security.md`.
- RAG evaluation skill should read `architecture/rag.md`, `architecture/ai-agent.md`, and eval fixtures under `evals/`.

## Related Documents

- `../AGENTS.md`
- `../PLANS.md`
- `../README.md`
- `../skills/`
