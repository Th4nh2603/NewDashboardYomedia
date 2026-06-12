import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { runInputGuardrails } from "../../guardrails/index.js";
import {
  appendShortMemoryTurn,
  buildShortMemoryKey,
  getShortMemory,
  mergeBuildDemoAttachments,
} from "../../memory/shortMemory.js";
import type {
  AgentContext,
  AgentResult,
  ChatAttachmentMeta,
  ChatProvider,
  RouteDecision,
  SupervisorResult,
} from "../../core/types.js";
import { resolveRoute } from "../router/routeIntent.js";
import { runAgents } from "../../orchestration/runAgents.js";
import { composeMultiResponse } from "../../orchestration/responseComposer.js";
import {
  logChatEvent,
  logChatFlowError,
  logChatFlowStep,
} from "../../logging/aiLogger.js";

type SupervisorInput = {
  question: string;
  provider?: ChatProvider;
  attachments?: ChatAttachmentMeta[];
  role: string;
  email?: string;
  sessionId?: string;
  req?: Request;
};

export async function runSupervisor(
  input: SupervisorInput,
): Promise<SupervisorResult | { ok: false; answer: string; provider: ChatProvider }> {
  const provider: ChatProvider = input.provider || "gemini";
  const requestId = randomUUID();
  logChatFlowStep(requestId, "message_received", {
    provider,
    role: input.role,
    email: input.email,
    sessionId: input.sessionId,
    attachments: input.attachments?.length ?? 0,
    questionLength: input.question.length,
  });

  const guardrailError = runInputGuardrails(input.question);
  if (guardrailError) {
    logChatFlowStep(requestId, "guardrail_block", {
      reason: guardrailError,
    });
    await logChatEvent({
      action: "chat_guardrail_block",
      description: guardrailError,
      role: input.role,
      email: input.email,
      metadata: { provider },
    });
    return { ok: false, answer: guardrailError, provider };
  }

  const startedAt = Date.now();
  const memoryKey = buildShortMemoryKey({
    email: input.email,
    role: input.role,
    sessionId: input.sessionId,
  });
  const history = getShortMemory(memoryKey);
  const sessionAttachments = mergeBuildDemoAttachments(
    memoryKey,
    input.attachments ?? [],
  );
  const ctx: AgentContext = {
    requestId,
    question: input.question,
    provider,
    role: input.role,
    email: input.email,
    sessionId: input.sessionId,
    memoryKey,
    history,
    attachments: sessionAttachments,
    req: input.req,
  };

  let route: RouteDecision;
  let results: AgentResult[];
  try {
    route = await resolveRoute(ctx);
    logChatFlowStep(requestId, "handler_route_start", {
      intent: route.intent,
      agents: route.agents,
    });
    results = await runAgents(route.agents, ctx);
    logChatFlowStep(requestId, "handler_route_result", {
      agents: route.agents,
      results: results.map((result) => ({
        agent: result.agent,
        ok: result.ok,
        confidence: result.confidence,
        toolCalled: result.toolCalled,
        sources: result.sources.length,
      })),
    });
  } catch (err) {
    logChatFlowError(requestId, "chat_flow", err, {
      provider,
      role: input.role,
      sessionId: input.sessionId,
    });
    throw err;
  }
  const successful = results.filter((r) => r.ok);

  if (!successful.length) {
    const top = results[0];
    const failedProvider =
      typeof top.metadata?.["usedProvider"] === "string"
        ? (top.metadata["usedProvider"] as ChatProvider)
        : provider;
    await logChatEvent({
      action: "chat_provider_failed",
      description: top.answer,
      role: input.role,
      email: input.email,
      metadata: {
        intent: route.intent,
        requestedProvider: provider,
        requestId,
        agents: route.agents,
        trace: { route, spans: top.spans, totalMs: Date.now() - startedAt },
      },
    });
    logChatFlowStep(requestId, "final_response", {
      ok: false,
      provider: failedProvider,
      intent: route.intent,
      agents: route.agents,
      totalMs: Date.now() - startedAt,
    });
    return { ok: false, answer: top.answer, provider: failedProvider };
  }

  logChatFlowStep(requestId, "response_synthesis_start", {
    intent: route.intent,
    agents: route.agents,
    successfulAgents: successful.map((result) => result.agent),
  });
  const composed = composeMultiResponse({
    requestId,
    provider,
    route,
    results,
    totalMs: Date.now() - startedAt,
  });
  const safeAnswer =
    composed.answer ||
    "Mình chưa có câu trả lời phù hợp. Bạn thử diễn đạt rõ hơn hoặc đổi provider.";
  composed.answer = safeAnswer;
  appendShortMemoryTurn(memoryKey, input.question, safeAnswer);
  logChatFlowStep(requestId, "response_synthesis_result", {
    intent: composed.intent,
    agent: composed.agent,
    provider: composed.provider,
    sources: composed.sources.length,
    answerLength: safeAnswer.length,
  });

  await logChatEvent({
    action: composed.intent === "actions" ? "chat_tool_called" : "chat_query",
    description:
      composed.intent === "actions"
        ? `Tool executed: ${composed.toolCalled || "unknown"}`
        : route.agents.length > 1
          ? `Multi-agent query: ${route.agents.join(" + ")}`
          : "Chat query processed",
    role: input.role,
    email: input.email,
    metadata: {
      intent: composed.intent,
      requestedProvider: provider,
      usedProvider: composed.provider,
      attachments: input.attachments?.length ?? 0,
      sources: composed.sources,
      classifier: {
        intent: route.intent,
        confidence: route.confidence,
        reason: route.reason,
      },
      classifierSource: route.source,
      sessionId: input.sessionId,
      memoryTurns: history.length,
      requestId,
      agents: route.agents,
      agent: composed.agent,
      tool: composed.toolCalled,
      trace: composed.trace,
    },
  });

  logChatFlowStep(requestId, "final_response", {
    ok: true,
    intent: composed.intent,
    agent: composed.agent,
    provider: composed.provider,
    totalMs: Date.now() - startedAt,
  });

  return composed;
}
