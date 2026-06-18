# Execution Plan Template

Use this template for non-trivial changes, including multi-file work, architecture changes, database changes, auth changes, RAG or agent changes, MCP tools, security-sensitive work, and behavior that affects multiple apps.

## Objective

- What user or system outcome should this change deliver?
- What is explicitly out of scope?

## Current Behavior

- Summarize the current behavior and relevant files.
- Include any known bugs, limitations, or constraints.

## Scope

- Apps/packages affected:
- User-facing behavior affected:
- Backend behavior affected:
- Documentation/eval/script changes needed:

## Constraints

- Architecture boundaries:
- Security constraints:
- Compatibility constraints:
- Performance constraints:

## Affected Files And Systems

- Frontend:
- Backend:
- Database:
- Contracts:
- RAG:
- Agents/MCP:
- Observability:
- Tests/evals:

## Implementation Phases

1. Inspect current code and tests.
2. Update contracts or schemas if needed.
3. Update backend service/repository/policy logic.
4. Update thin tRPC procedures or controllers.
5. Update frontend UI and API usage.
6. Update docs, evals, scripts, or skills.
7. Run verification and inspect diffs.

## Database Changes

- Schema changes:
- Migration plan:
- Backfill plan:
- Index changes:
- Rollback plan:
- Tenant and brand filtering impact:

## API Contract Changes

- Input schema changes:
- Output schema changes:
- Backward compatibility:
- Frontend migration:

## Security Considerations

- Authentication:
- Authorization:
- Tenant isolation:
- Brand isolation:
- Secret handling:
- Logging restrictions:
- Prompt/tool injection risks:

## Testing Strategy

- Unit tests:
- Integration/API tests:
- Repository tests:
- Frontend tests:
- Browser validation:
- RAG evals:
- Agent evals:
- Authorization and tenant-isolation tests:

## Verification Commands

```bash
pnpm verify
pnpm verify:changed
pnpm check:architecture
pnpm eval
pnpm --filter nova-ai-creative-suite build
pnpm --filter @yomedia/api-server build
```

Only mark commands as passed after running them.

## Rollback Strategy

- Code rollback:
- Database rollback:
- Config rollback:
- Feature flag or operational rollback:

## Risks

- Security:
- Data:
- Performance:
- Compatibility:
- User experience:
- Operational:

## Progress Checklist

- [ ] Read applicable `AGENTS.md` files.
- [ ] Inspected existing code and package scripts.
- [ ] Identified affected contracts and data flows.
- [ ] Implemented scoped changes.
- [ ] Updated docs/evals/scripts where needed.
- [ ] Ran available verification commands.
- [ ] Fixed failures caused by the change.

## Final Review Checklist

- [ ] Frontend contains UI logic only.
- [ ] Business logic is in backend services.
- [ ] tRPC procedures/controllers are thin.
- [ ] Repositories own database access.
- [ ] External input is validated.
- [ ] Tenant and brand authorization happen before data access.
- [ ] RAG answers preserve metadata and citations.
- [ ] Agent tools are authorized and logged safely.
- [ ] No secrets or confidential data are logged or committed.
- [ ] `git status --short` inspected.
- [ ] `git diff --check` inspected.
- [ ] `git diff` inspected.
