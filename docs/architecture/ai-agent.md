# AI Agent Architecture

## Purpose

Describe AI agent, RAG, MCP, SQL, tool orchestration, runtime context, validation, memory, trace, and fallback boundaries in `apps/api`.

## Scope

Use this document when working in:

- `apps/api/src/ai`
- `apps/api/src/rag`
- `apps/api/src/mcp`
- `apps/api/src/modules/chat`
- `apps/api/src/trpc/routers/chat.router.ts`
- RAG and agent evals under `evals/`

Mandatory backend rules live in `apps/api/AGENTS.md`. RAG-specific details live in `docs/architecture/rag.md`.

## Chat Flow

Chat requests should flow through:

```text
chat.router.ts
-> modules/chat/chat.service.ts
-> ai/agents/orchestrator
-> intent/general/rag/sql/tool agents
-> response agent
-> frontend-safe DTO
```

The frontend may send page context, but it is only hint data. The backend must recompute authenticated user, tenant, brand, permission, knowledge-base, and MCP scope.

## Agent Responsibilities

Agents live under `apps/api/src/ai`. They classify intent, route work, call approved tools, request RAG context, format responses, validate outputs, and emit sanitized execution traces.

## Agent Context

Use `AgentContext` as the runtime boundary for agent work. It must carry server-derived:

- `userId`
- `tenantId`
- `permissions`
- `allowedBrandIds`
- `allowedKnowledgeBaseIds`
- `allowedMcpTools`
- `conversationId`
- `message`
- optional page context

Agents may classify or plan work, but they must not grant permissions or bypass backend policy.

## Agent Router

The router selects the smallest capable agent set for a request. Routing should be deterministic where practical and auditable through agent step logs.

## Intent Classification

Intent classification must not grant permissions. It should label user intent, confidence, required capabilities, and whether RAG or tools may be needed.

## Multi-Intent Handling

Multi-intent requests should be split into ordered steps when safe. Authorization must be checked per step before data access or tool execution.

## RAG

Ingestion path:

```text
parser -> cleaner -> chunker -> embedder -> vector writer
```

Retrieval path:

```text
query embedding -> vector search -> keyword search -> hybrid search -> metadata filter -> reranker -> context builder -> answer generator
```

Always filter retrieval by allowed knowledge-base IDs and return citation metadata suitable for frontend display. See `docs/architecture/rag.md` for detailed RAG rules.

## SQL Agent

SQL agent output must be read-only. Backend code must validate SQL and inject tenant/brand scope before execution. Do not let generated SQL decide tenant, brand, permission, or data visibility.

TODO: Verify against implementation whether SQL execution is currently implemented or only scaffolded in `apps/api/src/ai/agents/sql`.

## Tool Registry

Tools must be registered with names, descriptions, schemas, authorization requirements, timeout limits, and safe output summaries.

## MCP Integration

Backend acts as MCP host/client. Agents should use `AgentTool` abstractions instead of raw MCP SDK details.

Every MCP call must pass:

- server/tool allowlist checks
- denied-tool checks where configured
- argument validation
- user permission checks
- timeout handling
- trace/log recording

MCP tools must go through backend MCP adapters, allowlists, argument validation, tenant/brand scope checks, and sanitized logging.

## Shared Context

Agent context may include authenticated user ID, tenant ID, permitted brand IDs, request ID, run ID, locale, conversation summary, and sanitized page hints. It must not include secrets.

## Memory Boundaries

Memory must be scoped by user, tenant, brand, and policy. Do not reuse private memories across unauthorized users, tenants, or brands.

## Step-By-Step Traces

Trace intent detection, agent selection, retrieval, tool calls, generation, and validation using sanitized summaries, durations, status, and error summaries.

Agent step logs should align with the shared observability contract in `packages/observability`.

## Validation

Validate model outputs before using them for tool calls, repository filters, SQL-like operations, or user-facing answers.

## Response Contract

Response agent output should become a DTO with:

- `answer`
- optional `data`
- `sources`
- `toolCalls`
- `steps`

Do not return raw provider responses, secrets, stack traces, SQL internals, or raw database entities.

## Fallback Behavior

When confidence is low, context is insufficient, tools are unauthorized, or providers fail, return a safe fallback with what can and cannot be completed.

## Retry Behavior

Retries must be bounded, timeout-aware, and safe for idempotency. Do not retry mutations unless the tool or service supports idempotency.

## Human Approval Boundaries

Require human approval for destructive actions, permission changes, external sends, large exports, or actions that affect data outside the current tenant/brand scope.

## Related Documents

- `docs/architecture/system.md`
- `docs/architecture/backend.md`
- `docs/architecture/rag.md`
- `docs/standards/security.md`
- `docs/standards/testing.md`
- `packages/observability/README.md`
- `evals/datasets/`
