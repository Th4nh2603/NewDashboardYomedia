# Demo SFTP Architecture

SFTP credentials are backend-only secrets loaded by the API service. The frontend may browse and request actions through backend HTTP/RPC endpoints, but it must never receive credentials or create a direct SFTP connection.

## Tool Groups

Read tools:

- `sftp.list`
- `sftp.read`
- `sftp.exists`
- `sftp.download`

Write tools:

- `sftp.write`
- `sftp.writeBinary`
- `sftp.mkdir`
- `sftp.setupDemoMedia`

Destructive tools:

- `sftp.delete`
- `sftp.rename`
- `sftp.overwrite`

## Safety Rules

- Normalize POSIX paths.
- Enforce remote demo storage root scope.
- Keep demo and media scopes explicit.
- Read actions usually do not require approval.
- Write and destructive actions require HITL approval by default.
- Revalidate policy after approval before execution.
- Approved SFTP execution must flow through `ToolGateway` and `ToolExecutor`; agents must not call `SftpService` directly.
- Sanitize activity logs, step logs, tool results, and approval summaries.
