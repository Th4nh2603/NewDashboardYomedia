# @yomedia/observability

Shared observability contracts for sanitized backend and agent execution logs.

`AgentStepLog` is a contract only. It should be adapted to the active backend logger in `apps/api/src/shared/logger/logger.ts` without logging raw secrets, private prompts, confidential documents, or private user data.
