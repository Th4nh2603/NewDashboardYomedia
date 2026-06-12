import { resolveActionTool } from "../../tools/detectTool.js";
import { classifyUserIntent } from "../../intent/classifyUserIntent.js";
import { detectAgentCandidates } from "../../intent/scoring.js";
import { hasBuildDemoAttachments } from "../../memory/shortMemory.js";
import { classifyIntentWithLlm } from "../../services/llm/classifyIntent.js";
import { logChatFlowStep } from "../../logging/aiLogger.js";
import type {
  AgentContext,
  AgentName,
  ChatAttachmentMeta,
  Intent,
  RouteDecision,
} from "../../core/types.js";

export type IntentAgentDecision = {
  intent: Intent;
  agents: AgentName[];
  confidence: number;
  reason: string;
  source: RouteDecision["source"];
  tool: ReturnType<typeof resolveActionTool>;
  scoringCandidates: AgentName[];
};

function attachmentsHavePayload(attachments: ChatAttachmentMeta[]): boolean {
  return attachments.some((att) => Boolean(att.contentBase64?.trim()));
}

function agentToIntent(agent: AgentName): Intent {
  if (agent === "sql") return "sql_query";
  if (agent === "dashboard") return "dashboard_insight";
  if (agent === "actions") return "actions";
  if (agent === "rag") return "knowledge_qa";
  return "free_chat";
}

function buildDecision(input: {
  agents: AgentName[];
  confidence: number;
  reason: string;
  source: RouteDecision["source"];
  tool: ReturnType<typeof resolveActionTool>;
  scoringCandidates: AgentName[];
}): IntentAgentDecision {
  const agents = input.agents.length
    ? input.agents
    : (["free_chat"] as AgentName[]);
  return {
    intent: agents.length > 1 ? "multi_intent" : agentToIntent(agents[0]),
    agents,
    confidence: input.confidence,
    reason: input.reason,
    source: input.source,
    tool: input.tool,
    scoringCandidates: input.scoringCandidates,
  };
}

/**
 * Agent-based intent analysis entrypoint.
 *
 * `scoring.ts` remains available as a heuristic signal provider, but routing no
 * longer calls it directly. This agent owns the final intent decision by merging
 * tool signals, heuristic candidates, and LLM/rule fallback.
 */
export async function runIntentAgent(
  ctx: AgentContext,
): Promise<IntentAgentDecision> {
  logChatFlowStep(ctx.requestId, "intent_agent_start", {
    provider: ctx.provider,
    attachments: ctx.attachments.length,
    historyTurns: ctx.history.length,
  });

  const scoringCandidates = detectAgentCandidates(ctx.question);
  const tool = resolveActionTool(ctx.question, {
    history: ctx.history,
    hasPendingAttachments:
      hasBuildDemoAttachments(ctx.memoryKey) ||
      attachmentsHavePayload(ctx.attachments),
    hasIncomingAttachments: attachmentsHavePayload(ctx.attachments),
  });

  logChatFlowStep(ctx.requestId, "intent_agent_signals", {
    tool,
    scoringCandidates,
  });

  const knowledgeCandidate = scoringCandidates.includes("rag");
  if (tool && knowledgeCandidate) {
    return buildDecision({
      agents: ["rag"],
      confidence: 0.85,
      reason: "Knowledge QA takes priority over active Build Demo session",
      source: "rule_fallback",
      tool,
      scoringCandidates,
    });
  }

  if (tool && scoringCandidates.length > 0) {
    return buildDecision({
      agents: ["actions", ...scoringCandidates],
      confidence: 0.9,
      reason: `Tool ${tool} + ${scoringCandidates.join(" + ")}`,
      source: "rule_multi",
      tool,
      scoringCandidates,
    });
  }

  if (tool) {
    return buildDecision({
      agents: ["actions"],
      confidence: 0.95,
      reason: "Matched action/tool keyword",
      source: "rule_tool",
      tool,
      scoringCandidates,
    });
  }

  if (scoringCandidates.length > 1) {
    return buildDecision({
      agents: scoringCandidates,
      confidence: 0.85,
      reason: `Multi-intent: ${scoringCandidates.join(" + ")}`,
      source: "rule_multi",
      tool,
      scoringCandidates,
    });
  }

  if (scoringCandidates.length === 1) {
    return buildDecision({
      agents: scoringCandidates,
      confidence: 0.8,
      reason: `Matched ${scoringCandidates[0]} agent`,
      source: "rule_fallback",
      tool,
      scoringCandidates,
    });
  }

  const llmIntent = await classifyIntentWithLlm(ctx.provider, ctx.question);
  const ruleIntent = classifyUserIntent(ctx.question);
  const picked = llmIntent || ruleIntent;

  if (picked.intent === "sql_query") {
    return buildDecision({
      agents: ["sql"],
      confidence: picked.confidence,
      reason: picked.reason,
      source: llmIntent ? "llm" : "rule_fallback",
      tool,
      scoringCandidates,
    });
  }

  if (picked.intent === "dashboard_insight") {
    return buildDecision({
      agents: ["dashboard"],
      confidence: picked.confidence,
      reason: picked.reason,
      source: llmIntent ? "llm" : "rule_fallback",
      tool,
      scoringCandidates,
    });
  }

  const agent: AgentName =
    picked.intent === "knowledge_qa"
      ? "rag"
      : picked.intent === "actions"
        ? "actions"
        : "free_chat";

  return buildDecision({
    agents: [agent],
    confidence: picked.confidence,
    reason: picked.reason,
    source: llmIntent ? "llm" : "rule_fallback",
    tool,
    scoringCandidates,
  });
}
