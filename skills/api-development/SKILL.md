# API Development Skill

## Purpose

Guide backend changes in `apps/api` so Express, tRPC, services, repositories, policies, validation, logging, and DTOs stay correctly separated.

## When To Use

Use this skill when changing backend modules, tRPC routers, middleware, auth, permissions, services, repositories, DTOs, error handling, logging, or API contracts.

## Required Files To Inspect

- `AGENTS.md`
- `apps/api/AGENTS.md`
- `docs/architecture/backend.md`
- `docs/standards/coding.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `apps/api/package.json`
- Relevant `apps/api/src/trpc` router and middleware files
- Relevant `apps/api/src/modules` service, repository, schema, policy, mapper, and type files

## Workflow

1. Identify the trust boundary and input schema.
2. Keep tRPC procedures thin: validate input, derive context, call service, return DTO.
3. Put business workflow in services.
4. Put authorization in policies.
5. Put persistence in repositories.
6. Apply tenant and brand authorization before data access.
7. Return frontend-safe DTOs.
8. Add or update tests when infrastructure exists.
9. Run backend build and architecture checks.

## Validation Commands

```bash
pnpm --filter @yomedia/api-server build
pnpm check:architecture
pnpm verify:changed
```

## Prohibited Actions

- Do not put business logic in tRPC procedures.
- Do not import database clients directly in routers or controllers.
- Do not make services depend on Express `Request` or `Response`.
- Do not trust client-provided tenant, brand, role, permission, SQL, knowledge-base, or MCP scope.
- Do not leak secrets, stack traces, raw entities, raw provider responses, or private prompts.

## Completion Checklist

- [ ] Input validated with Zod.
- [ ] Authenticated context used for scope.
- [ ] Tenant and brand authorization happen before protected access.
- [ ] Routers are thin.
- [ ] Services and repositories are separated.
- [ ] Logs are sanitized.
- [ ] Relevant commands run and results recorded.

## Result Report Format

- Changed backend areas:
- Validation commands run:
- Security or authorization notes:
- Remaining TODOs:
