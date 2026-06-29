import type { AgentContext } from "../ai/runtime/agent-context.js";

export function buildScopedMemorySummary(context: AgentContext): string {
  return [
    `conversation=${context.conversationId}`,
    `tenant=${context.tenantId}`,
    context.requestedBrandId ? `brand=${context.requestedBrandId}` : undefined,
    context.requestedKnowledgeBaseId
      ? `kb=${context.requestedKnowledgeBaseId}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}
