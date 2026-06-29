# Merged Agent Core Architecture

Diagrams:

- Overview: `docs/architecture/assets/merged-agent-core-overview.png`
- Detailed view: `docs/architecture/assets/merged-agent-core-detailed.png`
- Overview source: `docs/architecture/merged-agent-core-overview-with-data-layer.mmd`
- Detailed source: `docs/architecture/merged-agent-core-detailed-with-data-layer.mmd`
- Renderable HTML: `docs/architecture/merged-agent-core-overview-with-data-layer.html`

## Runtime Flow

`Chat API / Protected Procedure`
-> `AgentContextBuilder`
-> `Agent Runtime Core`
-> `AgentRegistry`
-> `PolicyGate`
-> `RAG Service` -> `Vector DB / Knowledge Store`, or
-> `SQL Safety` -> `Business / Report Database`, or
-> `ToolGateway`
-> `ToolExecutor`
-> `HITL Approval`
-> `Response + Observability`.

The frontend is UI only. It sends chat requests, renders answers, steps, citations, tool calls, and pending approval DTOs. It never receives SFTP credentials and never connects to SFTP directly.

## Data Layer / Persistence

All database and storage credentials are backend-only. The frontend never connects directly to any database, vector store, business/report database, SFTP service, or secrets manager.

- `Application Database` (`PostgreSQL` / `MySQL`) is the primary application persistence layer for users, tenants, brands, roles, permissions, sessions, configs, chat sessions, chat messages, agent runs, tool runs, pending approvals, approval history, and memory summaries when persisted.
- `Vector DB / Knowledge Store` (`pgvector` / `Qdrant` / `Pinecone` / `Chroma`) stores documents, chunks, embeddings, metadata, and citation references. `RAG Service` queries it; the RAG service does not own or silently embed private document storage inside the agent runtime.
- `Business / Report Database` stores report, crawl, business, and dashboard data for SQL-style answers. `SqlAgent` must not query it directly. The allowed path is `SqlAgent` -> `Agent Runtime Core` -> `Unified Policy Gate` -> `SQL Safety` -> `Business / Report Database`.
- `Log / Audit Store` persists sanitized step logs, audit logs, tool runs, policy decisions, result-sanitization records, and safe error summaries. `Response + Observability`, `Unified Policy Gate`, `Shared Tool Gate`, and `Tool Executor` write to it.

## Backend Trusted Scope

The backend derives user, tenant, brand, knowledge-base, permission, and tool scope from authenticated context. Client-provided tenant, brand, KB, or tool values are hints only and must be checked server side before use.

## Agent Branches

- `RagAgent`: document-grounded answers with citations.
- `SqlAgent`: read-only reporting/query answers behind SQL safety.
- `GeneralAgent`: normal LLM answers without tool execution.
- `DemoAgent`: demo, preview, and SFTP operations through the shared tool gate.

## Runtime Core

The runtime core owns orchestration, scoped memory, intent detection, skill catalog metadata, agent registry checks, system prompt assembly, max-step control, and final answer assembly. Agents may plan tool calls, but all execution goes through `ToolGateway`.

## Durable HITL And Audit

Approval state is durable and replay-safe. Pending approvals survive server restart, approved execution revalidates `PolicyGate`, and expired, rejected, executed, or failed approvals cannot be replayed as fresh tool execution.

Audit records are durable and sanitized. They include tenant, user, tool, action type, approval status, policy decision, result status, sanitized input, sanitized output summary, and safe error details.

`HITL Approval` persists pending approvals and approval history in the `Application Database`. Sanitized approval events and tool execution outcomes are also written to the `Log / Audit Store`.

`SFTP Service / Remote Demo Storage` is remote file/demo storage only. It is not the application database, knowledge store, report database, or audit store.

`allowedMcpTools` remains as a legacy compatibility field only. MCP is not enabled in this Agent Core path; new code should prefer `allowedToolCapabilities`.

## No MCP In This Refactor

Do not introduce MCP into this merged core path. Existing MCP code remains separate until a future explicit migration.
