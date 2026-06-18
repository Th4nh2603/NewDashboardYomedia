# Evaluation Scenarios

These scenarios describe deterministic expectations for local checks and optional model-based evals.

- Intent classification should select the minimum required capability.
- Agent routing should not grant authorization.
- Tool selection should require allowlisted tools and validated arguments.
- RAG must preserve metadata and citations.
- Tenant and brand isolation must be enforced before retrieval.
- Prompt injection content in user text or documents must not override system policy.
