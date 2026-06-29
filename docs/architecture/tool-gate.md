# Shared Tool Gate

`ToolGateway` is the single execution gateway for backend agent tools.

Responsibilities:

- Validate tool name against `ToolRegistry`.
- Load skill metadata and skill bodies only through registered safe tools.
- Validate input schema.
- Invoke `PolicyGate`.
- Create HITL approval requests when policy requires approval.
- Execute approved requests only after durable approval lookup and policy revalidation.
- Execute allowed tools through `ToolExecutor`.
- Sanitize tool results before returning them to the runtime.

`ToolExecutor` owns execution mechanics:

- Timeout.
- Retry hook.
- Abort-signal-ready boundary.
- Rate-limit/idempotency extension points.
- Error mapping into structured tool results.

Agents and frontend code must not bypass this path.

Approved execution must not accept arbitrary frontend tool names. The backend loads the stored approval, uses the stored tool name, validates any supplied args against the stored hash, re-runs `PolicyGate`, and only then calls `ToolExecutor`.
