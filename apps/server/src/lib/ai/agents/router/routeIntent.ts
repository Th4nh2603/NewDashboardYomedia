import { resolveActionTool } from "../../tools/detectTool.js";
import { classifyUserIntent } from "../../intent/classifyUserIntent.js";
import { hasBuildDemoAttachments } from "../../memory/shortMemory.js";
import type {
  AgentContext,
  AgentName,
  ChatAttachmentMeta,
  Intent,
  RouteDecision,
} from "../../core/types.js";
import { classifyIntentWithLlm } from "../../services/llm/classifyIntent.js";
import { detectAgentCandidates } from "../../intent/scoring.js";

function agentToIntent(agent: AgentName): Intent {
  if (agent === "sql") return "sql_query";
  if (agent === "dashboard") return "dashboard_insight";
  if (agent === "actions") return "actions";
  if (agent === "rag") return "knowledge_qa";
  return "free_chat";
}

function buildRoute(input: {
  agents: AgentName[];
  confidence: number;
  reason: string;
  source: RouteDecision["source"];
}): RouteDecision {
  const agents = input.agents.length
    ? input.agents
    : (["free_chat"] as AgentName[]);
  const intent: Intent =
    agents.length > 1 ? "multi_intent" : agentToIntent(agents[0]);
  return {
    intent,
    agent: agents[0],
    agents,
    confidence: input.confidence,
    reason: input.reason,
    source: input.source,
  };
}

function attachmentsHavePayload(attachments: ChatAttachmentMeta[]): boolean {
  return attachments.some((att) => Boolean(att.contentBase64?.trim()));
}

export async function resolveRoute(ctx: AgentContext): Promise<RouteDecision> {
  const candidates = detectAgentCandidates(ctx.question);
  const tool = resolveActionTool(ctx.question, {
    history: ctx.history,
    hasPendingAttachments:
      hasBuildDemoAttachments(ctx.memoryKey) ||
      attachmentsHavePayload(ctx.attachments),
    hasIncomingAttachments: attachmentsHavePayload(ctx.attachments),
  });
  const knowledgeCandidate = candidates.includes("rag");
  if (tool && knowledgeCandidate) {
    return buildRoute({
      agents: ["rag"],
      confidence: 0.85,
      reason: "Knowledge QA takes priority over active Build Demo session",
      source: "rule_fallback",
    });
  }
  if (tool && candidates.length > 0) {
    return buildRoute({
      agents: ["actions", ...candidates],
      confidence: 0.9,
      reason: `Tool ${tool} + ${candidates.join(" + ")}`,
      source: "rule_multi",
    });
  }
  if (tool) {
    return buildRoute({
      agents: ["actions"],
      confidence: 0.95,
      reason: "Matched action/tool keyword",
      source: "rule_tool",
    });
  }

  if (candidates.length > 1) {
    return buildRoute({
      agents: candidates,
      confidence: 0.85,
      reason: `Multi-intent: ${candidates.join(" + ")}`,
      source: "rule_multi",
    });
  }
  if (candidates.length === 1) {
    return buildRoute({
      agents: candidates,
      confidence: 0.8,
      reason: `Matched ${candidates[0]} agent`,
      source: "rule_fallback",
    });
  }

  const llmIntent = await classifyIntentWithLlm(ctx.provider, ctx.question);
  const ruleIntent = classifyUserIntent(ctx.question);
  const picked = llmIntent || ruleIntent;

  if (picked.intent === "sql_query") {
    return buildRoute({
      agents: ["sql"],
      confidence: picked.confidence,
      reason: picked.reason,
      source: llmIntent ? "llm" : "rule_fallback",
    });
  }
  if (picked.intent === "dashboard_insight") {
    return buildRoute({
      agents: ["dashboard"],
      confidence: picked.confidence,
      reason: picked.reason,
      source: llmIntent ? "llm" : "rule_fallback",
    });
  }

  const agent: AgentName =
    picked.intent === "knowledge_qa"
      ? "rag"
      : picked.intent === "actions"
        ? "actions"
        : "free_chat";

  return buildRoute({
    agents: [agent],
    confidence: picked.confidence,
    reason: picked.reason,
    source: llmIntent ? "llm" : "rule_fallback",
  });
}
