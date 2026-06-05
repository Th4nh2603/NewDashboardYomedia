import type { AgentContext, AgentResult, ChatProvider } from "../../core/types.js";
import { retrieveKnowledgeContext } from "../../retrieval/knowledgeBase.js";
import { callProvider } from "../../services/llm/callProvider.js";
import { logBestEffort } from "../../../logBestEffort.js";
export async function runRagAgent(ctx: AgentContext): Promise<AgentResult> {
  const startedAt = Date.now();
  let usedProvider: ChatProvider = ctx.provider;
  let answer = "";
  let sources: string[] = [];
  const prompt = await (async () => {
    const retrieved = await retrieveKnowledgeContext(ctx.question);
    sources = retrieved.sources;
    return retrieved.contextPrompt || retrieved.fallbackMessage || ctx.question;
  })();

  try {
    answer = await callProvider(ctx.provider, prompt, ctx.history);
  } catch (primaryError) {
    const fallback: ChatProvider = ctx.provider === "openai" ? "gemini" : "openai";
    try {
      answer = await callProvider(fallback, prompt, ctx.history);
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
        agent: "rag",
        answer:
          "Hiện chưa gọi được AI provider. Vui lòng thử lại sau hoặc kiểm tra API key server.",
        confidence: 0,
        sources,
        fallbackUsed: false,
        spans: [
          {
            agent: "rag",
            startedAt,
            endedAt: Date.now(),
            ok: false,
            error: message,
            sources,
          },
        ],
      };
    }
  }

  return {
    ok: true,
    agent: "rag",
    answer,
    confidence: 0.8,
    sources,
    fallbackUsed: usedProvider !== ctx.provider,
    metadata: { usedProvider },
    spans: [
      {
        agent: "rag",
        startedAt,
        endedAt: Date.now(),
        ok: true,
        confidence: 0.8,
        sources,
      },
    ],
  };
}

