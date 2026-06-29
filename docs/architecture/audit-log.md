# Durable Audit Log

Audit logs are durable, backend-owned, and sanitized. They are used for agent/tool approval creation, approval decisions, approved execution, policy revalidation failures, and execution failures.

Fields include:

- `id`
- `userId`
- `tenantId`
- `brandId`
- `sessionId`
- `requestId`
- `agentName`
- `toolName`
- `actionType`
- `approvalId`
- `approvalStatus`
- `policyDecision`
- `resultStatus`
- `sanitizedInput`
- `sanitizedOutputSummary`
- `errorCode`
- `errorMessage`
- `createdAt`

Audit logs must never include credentials, tokens, SFTP host/user/password/private key values, raw private file content, or full confidential prompts/documents.
