# AI Agent Guidelines

These rules apply to `apps/api/src/ai`.

## Purpose

This directory owns backend-only AI provider access, multi-agent orchestration, intent detection, tool selection, memory boundaries, guardrails, prompts, and agent runtime context.

## Required References

- Read root `AGENTS.md`.
- Read `apps/api/AGENTS.md`.
- Use `docs/architecture/ai-agent.md`, `docs/architecture/rag.md`, and `docs/standards/security.md` for design guidance.

## Rules

- The merged agent core path is: Chat API -> AgentContextBuilder -> Orchestrator/Agent Loop -> AgentRegistry -> PolicyGate -> ToolGateway -> ToolExecutor -> Response/Observability.
- Agent branches are stable: `RagAgent`, `SqlAgent`, `GeneralAgent`, and `DemoAgent`.
- Agents must never execute tools directly. They may only plan/request tool calls through the shared ToolGateway.
- Do not introduce MCP into this core path yet.
- Do not delete `scoring.ts` if it appears; keep it for compatibility or comparison.
- Load skill bodies only on demand through registered safe tools.
- Revalidate policy after HITL approval before any future approved execution route runs a tool.
- Approval state must be durable and replay-safe; expired, rejected, or executed approvals cannot execute.
- `allowedMcpTools` is legacy naming only. Do not add MCP; prefer `allowedToolCapabilities` for new agent-core code.
- Agents may access external systems only through approved tools, MCP adapters, or backend services.
- Tool selection must check authorization before execution.
- Tenant and brand scope must come from authenticated backend context, not model output or client input.
- Keep prompts free of secrets and avoid embedding private document contents in logs or traces.
- Agent traces must store sanitized summaries, durations, status, and error summaries only.
- Validate model output before it is used as a tool call, SQL-like query, repository filter, or final answer.
- RAG answers must preserve source metadata and citations supplied by retrieval.
- Memory must not cross tenant, brand, or user boundaries unless an explicit backend policy allows it.

## Prohibited Actions

- Do not call external services directly from prompts or unregistered agents.
- Do not let model output bypass policy checks.
- Do not log full prompts, access tokens, API keys, private documents, or private user data.
- Do not create placeholder agents that appear production-ready but only return canned success.
