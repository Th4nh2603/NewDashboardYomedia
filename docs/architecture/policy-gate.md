# Unified Policy Gate

`PolicyGate` is the common backend decision point for tool execution safety.

Responsibilities:

- Validate arguments after schema parsing.
- Check user permissions.
- Enforce backend-derived tenant, brand, KB, and tool scope.
- Block unsafe path arguments such as traversal outside the allowed root.
- Decide `allow`, `deny`, or `requiresApproval`.
- Keep logs and approval summaries sanitized.

Agents must not implement their own permission, approval, or path checks. They request a tool call and let `ToolGateway` invoke `PolicyGate`.

HITL approval does not permanently authorize execution. Approved execution endpoints must re-run policy before executing the stored action and must write durable audit records for approval creation, policy revalidation failures, execution success, and execution failure.
