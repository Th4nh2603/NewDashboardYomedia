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

---

# Active Plan: Chat Orchestrator Refactor

## Objective

- Preserve the existing ChatView -> api.chat.sendMessage -> chat.router.ts -> chat.service.ts flow while adding a backend agent orchestrator loop with tool and skill registries.
- Move ToolAgent away from frontend-only action DTOs toward backend tool-calling with approval metadata for dangerous workflows.
- Keep RAG authorization, citations, and insufficient-context behavior intact.

## Current Behavior

- `chat.router.ts` already uses `protectedProcedure`, validates `chatMessageSchema`, and passes auth from `ctx.user` into `chat.service.ts`.
- `chatPolicy.buildExecutionScope` is the backend permission and scope authority.
- `OrchestratorAgent` currently routes once by intent to General/RAG/SQL/Tool and normalizes via ResponseAgent.
- `ToolAgent` currently returns `action` DTOs such as `delete_uploaded_demo` and `build_demo_convert_upload` for ChatView to execute.
- `ChatView` does not persist the returned `conversationId` into subsequent `sendMessage` calls.

## Scope

- Backend:
  - Add `Orchestrator.run(agent, userQuery, context)` loop with `maxSteps`.
  - Add `ToolRegistry`, `SkillRegistry`, LLM provider adapter abstraction, and HITL approval gate.
  - Register backend-safe tool wrappers for demo/SFTP/preview/banner workflows with `requiresApproval` where appropriate.
  - Return sanitized step logs, tool calls, and approval DTOs in `ChatResponseDto`.
- Frontend:
  - Store backend `conversationId` and send it with subsequent chat messages in the same UI session.
  - Render returned agent steps in a compact Agent Step Viewer.
- Docs/tests:
  - Add a mock/unit test for the orchestrator loop.
  - Update `docs/architecture/chat-flow.md` with new flowchart, sequence diagram, frontend/backend boundaries, HITL, and SkillRegistry behavior.

## Follow-Up Scope

- Full binary upload, SFTP mutation, banner creation, send-message, and SQL execution remain approval-gated until concrete backend services and audit persistence are available.
- Existing frontend demo/banner workflow helpers remain in place for compatibility during migration.

## Security Considerations

- Client-provided tenant, brand, role, permission, and tool scope remain untrusted hints.
- Dangerous tools return an approval-required DTO instead of executing.
- Tool execution checks backend-derived permissions and allowed MCP/tool scope.
- Step logs and tool results are sanitized and do not include secrets, raw prompts, private document bodies, SQL internals, or credentials.

## Testing Strategy

- Add a deterministic orchestrator loop test using mock LLM and mock tools.
- Run backend TypeScript build after API/AI changes.
- Run frontend TypeScript check after ChatView changes.
- Run architecture checks if feasible.

## Progress Checklist

- [x] Read applicable `AGENTS.md` files.
- [x] Inspected existing package scripts and chat/RAG/tool code.
- [x] Implement backend orchestrator, registries, HITL, DTO updates.
- [x] Update ChatView conversation state and Agent Step Viewer.
- [x] Add orchestrator mock test.
- [x] Update chat-flow documentation.
- [x] Run targeted verification and inspect diffs.
