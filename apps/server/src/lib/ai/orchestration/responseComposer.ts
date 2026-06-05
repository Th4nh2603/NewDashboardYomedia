import type {
  AgentResult,
  ChatProvider,
  RouteDecision,
  SupervisorResult,
} from "../core/types.js";
import { mergeAgentAnswers, rankAgentResults } from "./aggregator.js";

export function composeResponse(input: {
  requestId: string;
  provider: ChatProvider;
  route: RouteDecision;
  result: AgentResult;
  totalMs: number;
}): SupervisorResult {
  return composeMultiResponse({
    requestId: input.requestId,
    provider: input.provider,
    route: input.route,
    results: [input.result],
    totalMs: input.totalMs,
  });
}

export function composeMultiResponse(input: {
  requestId: string;
  provider: ChatProvider;
  route: RouteDecision;
  results: AgentResult[];
  totalMs: number;
}): SupervisorResult {
  const ranked = rankAgentResults(input.results);
  const top = ranked[0];
  const successful = ranked.filter((r) => r.ok);
  const answer =
    input.route.agents.length > 1
      ? mergeAgentAnswers(
          successful.length ? successful : ranked,
          input.route.agents,
        )
      : top.answer;

  const usedProvider =
    typeof top.metadata?.["usedProvider"] === "string"
      ? (top.metadata["usedProvider"] as ChatProvider)
      : input.provider;

  const sources = [...new Set(ranked.flatMap((r) => r.sources))];
  const spans = ranked.flatMap((r) => r.spans);
  const fallbackUsed = ranked.some((r) => r.fallbackUsed);
  const toolCalled = ranked.find((r) => r.toolCalled)?.toolCalled;
  const buildDemoProcessing = ranked.some((r) => r.buildDemoProcessing);

  return {
    ok: true,
    answer,
    provider: usedProvider,
    intent: input.route.intent,
    agent: input.route.agent,
    sources,
    fallbackUsed,
    toolCalled,
    buildDemoProcessing,
    trace: {
      requestId: input.requestId,
      route: input.route,
      spans,
      totalMs: input.totalMs,
    },
  };
}
