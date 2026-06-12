import type { AgentContext, RouteDecision } from "../../core/types.js";
import { logChatFlowStep } from "../../logging/aiLogger.js";
import { runIntentAgent } from "./intentAgent.js";

export async function resolveRoute(ctx: AgentContext): Promise<RouteDecision> {
  logChatFlowStep(ctx.requestId, "intent_analysis_start", {
    provider: ctx.provider,
    questionLength: ctx.question.length,
  });

  const decision = await runIntentAgent(ctx);
  const route: RouteDecision = {
    intent: decision.intent,
    agent: decision.agents[0],
    agents: decision.agents,
    confidence: decision.confidence,
    reason: decision.reason,
    source: decision.source,
  };

  logChatFlowStep(ctx.requestId, "intent_agent_result", {
    intent: route.intent,
    agent: route.agent,
    agents: route.agents,
    confidence: route.confidence,
    source: route.source,
    reason: route.reason,
    tool: decision.tool,
    scoringCandidates: decision.scoringCandidates,
  });

  logChatFlowStep(ctx.requestId, "route_selected", {
    route: route.intent,
    agents: route.agents,
  });

  return route;
}
