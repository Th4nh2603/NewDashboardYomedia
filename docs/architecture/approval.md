# HITL Approval Architecture

Approval records are durable backend state. They use the repository pattern already used by the API server and persist under server-owned data storage.

Approval statuses:

- `pending`
- `approved`
- `rejected`
- `expired`
- `executed`
- `failed`

Rules:

- Pending approvals survive server restart.
- Expired approvals cannot execute.
- Rejected approvals cannot execute.
- Executed approvals cannot replay.
- Approved execution is idempotent by status: once executed or failed, the same approval is not treated as fresh work.
- Approval args are protected with a canonical SHA-256 hash.
- Raw sensitive args are not logged. Only sanitized summaries are returned to the frontend.
- If args were not safely persisted, the execution route may accept supplied args only when their hash matches the approved request.

Approved execution flow:

1. Load approval by `approvalId`.
2. Verify current user, tenant, and brand scope.
3. Verify status is `approved`.
4. Verify not expired and not already executed.
5. Rebuild trusted backend `AgentContext`.
6. Re-run `PolicyGate` through `ToolGateway.executeApproved`.
7. Execute through `ToolExecutor`.
8. Mark approval `executed` or `failed`.
9. Write durable sanitized audit log.
