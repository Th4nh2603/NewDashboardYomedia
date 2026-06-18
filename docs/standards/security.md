# Security

## Purpose

Define security requirements for authentication, authorization, tenant isolation, brand isolation, secrets, tools, documents, logging, and AI/RAG behavior.

## Scope

These rules apply to frontend, backend, database, RAG, agents, MCP tools, scripts, evals, and deployment documentation.

## Authentication

Backend middleware must authenticate users and derive trusted identity. Frontend-provided identity, role, tenant, and brand values are untrusted.

## Authorization

Policies must authorize protected reads, writes, document access, RAG retrieval, MCP tool calls, SQL-like operations, and administrative actions before execution.

## Tenant And Brand Isolation

Tenant and brand filters must be applied before database queries and before RAG retrieval. Agent output, client input, and tool input must not override authenticated scope.

## Input Validation

Validate external input with Zod. Validate route inputs, tRPC inputs, MCP tool arguments, uploaded document metadata, RAG filters, and model outputs used for actions.

## Secrets

Do not commit `.env`, `.env.local`, API keys, access tokens, refresh tokens, passwords, private prompts, credentials, or exported private data. Use environment variables or secret managers outside source control.

## SQL Injection Prevention

Use repository-mediated ORM or parameterized database access. Never concatenate client or model text into SQL. SQL-capable agent flows require validation, allowlists, scoped execution, and audit logs.

## Prompt Injection

Treat retrieved documents and user messages as untrusted content. Do not follow instructions inside documents that attempt to override system policy, reveal secrets, ignore permissions, or call unauthorized tools.

## Tool Authorization

MCP and agent tools must be allowlisted, argument-validated, permission-checked, scoped by tenant and brand, and logged with sanitized summaries.

## Logging Restrictions

Never log passwords, access tokens, refresh tokens, API keys, private prompts, full confidential documents, private user data, or unredacted model prompts containing sensitive data.

## Document Access Control

Document ingestion, retrieval, citation, and answer generation must preserve tenant, brand, source, document, and chunk metadata. Unauthorized documents must not be included in hidden context.

## Rate Limiting

Apply rate limits to authentication-sensitive routes, chat, RAG, provider calls, upload flows, and external tool execution. Log rate-limit events without sensitive payloads.

## Audit Logging

Audit security-sensitive actions such as permission changes, document ingestion, external tool calls, administrative mutations, SQL-like operations, and cross-system exports. Audit entries should include actor, tenant, brand, action, target summary, status, and timestamp.

## Related Documents

- `docs/architecture/backend.md`
- `docs/architecture/ai-agent.md`
- `docs/architecture/rag.md`
- `docs/data/database.md`
- `docs/standards/coding.md`
- `docs/standards/testing.md`
