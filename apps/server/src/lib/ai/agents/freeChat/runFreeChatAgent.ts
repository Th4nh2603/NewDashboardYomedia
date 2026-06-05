import type { AgentContext, AgentResult, ChatProvider } from "../../core/types.js";
import { callProvider } from "../../services/llm/callProvider.js";
import { logBestEffort } from "../../../logBestEffort.js";
export async function runFreeChatAgent(ctx: AgentContext): Promise<AgentResult> {
  const startedAt = Date.now();
  let usedProvider: ChatProvider = ctx.provider;
  let answer = "";
  try {
    answer = await callProvider(ctx.provider, ctx.question, ctx.history);
  } catch (primaryError) {
    const fallback: ChatProvider = ctx.provider === "openai" ? "gemini" : "openai";
    try {
      answer = await callProvider(fallback, ctx.question, ctx.history);
      usedProvider = fallback;
    } catch (fallbackErr) {
      logBestEffort("ai.provider.fallback", fallbackErr, {
        requestedProvider: ctx.provider,
        fallback,
      });
      const message =
        primaryError instanceof Error ? primaryError.message : "AI provider unavailable";
      return {
        ok: false,
        agent: "free_chat",
        answer:
          "Hiện chưa gọi được AI provider. Vui lòng thử lại sau hoặc kiểm tra API key server.",
        confidence: 0,
        sources: [],
        fallbackUsed: false,
        spans: [
          {
            agent: "free_chat",
            startedAt,
            endedAt: Date.now(),
            ok: false,
            error: message,
          },
        ],
      };
    }
  }
  return {
    ok: true,
    agent: "free_chat",
    answer,
    confidence: 0.7,
    sources: [],
    fallbackUsed: usedProvider !== ctx.provider,
    metadata: { usedProvider },
    spans: [
      {
        agent: "free_chat",
        startedAt,
        endedAt: Date.now(),
        ok: true,
        confidence: 0.7,
      },
    ],
  };
}

