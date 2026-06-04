import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  executeTool,
  resolveActionTool,
  runBuildDemoTool,
} from "../actions/index.js";
import { findAccountByEmail } from "../../auth/accounts.js";
import { resolveAllowedBuildDemoBrands } from "../../../services/permissions.js";
import { getModel, getSystemPrompt } from "../core/config.js";
import type {
  ChatAttachmentMeta,
  ChatProvider,
  MemoryMessage,
  RagAnswerResult,
} from "../core/types.js";
import {
  appendShortMemoryTurn,
  buildShortMemoryKey,
  getShortMemory,
  hasBuildDemoAttachments,
} from "../memory/shortMemory.js";
import { runInputGuardrails } from "../guardrails/index.js";
import { classifyUserIntent } from "../intent/classifyUserIntent.js";
import type { IntentClassification } from "../intent/types.js";
import { logChatEvent } from "../logging/aiLogger.js";
import { retrieveKnowledgeContext } from "../retrieval/knowledgeBase.js";
import { logBestEffort } from "../../logBestEffort.js";
import { serviceUnavailable } from "../../http/errors.js";

async function callOpenAi(prompt: string, history: MemoryMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw serviceUnavailable("OPENAI_API_KEY is missing");
  }
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: getModel("openai"),
    messages: [
      { role: "system", content: getSystemPrompt() },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

async function callGemini(prompt: string, history: MemoryMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw serviceUnavailable("GEMINI_API_KEY is missing");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getModel("gemini"),
    systemInstruction: getSystemPrompt(),
  });
  const response = await model.generateContent({
    contents: [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ],
  });
  return response.response.text().trim();
}

async function callProvider(
  provider: ChatProvider,
  prompt: string,
  history: MemoryMessage[],
) {
  return provider === "openai"
    ? callOpenAi(prompt, history)
    : callGemini(prompt, history);
}

function parseIntentClassifierOutput(raw: string): IntentClassification | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || normalized).trim();
  try {
    const parsed = JSON.parse(candidate) as Partial<IntentClassification>;
    if (!parsed || (parsed.intent !== "knowledge_qa" && parsed.intent !== "free_chat")) {
      return null;
    }
    return {
      intent: parsed.intent,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.7,
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "LLM classified user intent",
    };
  } catch (err) {
    logBestEffort("ai.intent.parse", err);
    return null;
  }
}

async function classifyIntentWithLlm(
  provider: ChatProvider,
  question: string,
): Promise<IntentClassification | null> {
  const prompt = [
    "Classify the user intent for internal assistant routing.",
    "Return STRICT JSON only, no markdown, no extra text.",
    'Schema: {"intent":"knowledge_qa|free_chat","confidence":0..1,"reason":"short"}',
    "",
    "Rules:",
    "- knowledge_qa: asking for internal docs, policy, SOP, guide, process, technical reference, retrieval from knowledge base.",
    "- free_chat: general conversation/opinion/chitchat not requiring internal knowledge retrieval.",
    "- Prefer knowledge_qa when uncertain between those two.",
    "",
    `User message: ${JSON.stringify(question)}`,
  ].join("\n");
  try {
    const raw = await callProvider(provider, prompt, []);
    return parseIntentClassifierOutput(raw);
  } catch (err) {
    logBestEffort("ai.intent.classifier", err, { provider });
    return null;
  }
}

export async function answerWithRag(input: {
  question: string;
  provider?: ChatProvider;
  attachments?: ChatAttachmentMeta[];
  role: string;
  email?: string;
  sessionId?: string;
}): Promise<RagAnswerResult | { ok: false; answer: string; provider: ChatProvider }> {
  const provider: ChatProvider = input.provider || "gemini";
  const guardrailError = runInputGuardrails(input.question);
  if (guardrailError) {
    await logChatEvent({
      action: "chat_guardrail_block",
      description: guardrailError,
      role: input.role,
      email: input.email,
      metadata: { provider },
    });
    return { ok: false, answer: guardrailError, provider };
  }

  const memoryKey = buildShortMemoryKey({
    email: input.email,
    role: input.role,
    sessionId: input.sessionId,
  });
  const history = getShortMemory(memoryKey);
  const tool = resolveActionTool(input.question, {
    history,
    hasPendingAttachments: hasBuildDemoAttachments(memoryKey),
  });
  const ruleIntent = classifyUserIntent(input.question);
  const llmIntent = tool
    ? null
    : await classifyIntentWithLlm(provider, input.question);
  const intentInfo: IntentClassification = tool
    ? {
        intent: "actions",
        confidence: 0.95,
        reason: "Matched action/tool keyword",
      }
    : llmIntent || ruleIntent;
  const classifierSource = tool ? "rule_tool" : llmIntent ? "llm" : "rule_fallback";

  if (intentInfo.intent === "actions" && tool) {
    const allowedBuildDemoBrands = (() => {
      const role = String(input.role || "").trim().toLowerCase();
      if (role === "admin") return null;
      const account = input.email
        ? findAccountByEmail(input.email)
        : undefined;
      return account ? resolveAllowedBuildDemoBrands(account) : [];
    })();

    const buildDemoRun =
      tool === "build_demo"
        ? await runBuildDemoTool({
            question: input.question,
            provider,
            history,
            attachments: input.attachments ?? [],
            allowedBrands: allowedBuildDemoBrands,
            memoryKey,
          })
        : null;
    const answer = buildDemoRun?.answer ?? executeTool(tool);
    appendShortMemoryTurn(memoryKey, input.question, answer);
    await logChatEvent({
      action: "chat_tool_called",
      description: `Tool executed: ${tool}`,
      role: input.role,
      email: input.email,
      metadata: {
        tool,
        provider,
        intent: intentInfo.intent,
        classifierSource,
        attachmentCount: input.attachments?.length ?? 0,
      },
    });
    return {
      ok: true,
      answer,
      provider,
      toolCalled: tool,
      intent: intentInfo.intent,
      sources: [],
      fallbackUsed: false,
      buildDemoProcessing: buildDemoRun?.executed ?? false,
    };
  }

  let usedProvider: ChatProvider = provider;
  let answer = "";
  let sources: string[] = [];
  const prompt =
    intentInfo.intent === "knowledge_qa"
      ? await (async () => {
          const retrieved = await retrieveKnowledgeContext(input.question);
          sources = retrieved.sources;
          return retrieved.contextPrompt || retrieved.fallbackMessage || input.question;
        })()
      : input.question;

  try {
    answer = await callProvider(provider, prompt, history);
  } catch (primaryError) {
    const fallback: ChatProvider = provider === "openai" ? "gemini" : "openai";
    try {
      answer = await callProvider(fallback, prompt, history);
      usedProvider = fallback;
    } catch (fallbackErr) {
      logBestEffort("ai.provider.fallback", fallbackErr, {
        requestedProvider: provider,
        fallback,
      });
      const message =
        primaryError instanceof Error
          ? primaryError.message
          : "AI provider unavailable";
      await logChatEvent({
        action: "chat_provider_failed",
        description: message,
        role: input.role,
        email: input.email,
        metadata: { requestedProvider: provider, intent: intentInfo.intent },
      });
      return {
        ok: false,
        answer:
          "Hiện chưa gọi được AI provider. Vui lòng thử lại sau hoặc kiểm tra API key server.",
        provider,
      };
    }
  }

  const safeAnswer =
    answer ||
    "Mình chưa có câu trả lời phù hợp. Bạn thử diễn đạt rõ hơn hoặc đổi provider.";
  appendShortMemoryTurn(memoryKey, input.question, safeAnswer);

  await logChatEvent({
    action: "chat_query",
    description: "Chat query processed",
    role: input.role,
    email: input.email,
    metadata: {
      intent: intentInfo.intent,
      requestedProvider: provider,
      usedProvider,
      attachments: input.attachments?.length ?? 0,
      sources,
      classifier: intentInfo,
      classifierSource,
      sessionId: input.sessionId,
      memoryTurns: history.length,
    },
  });

  return {
    ok: true,
    answer: safeAnswer,
    provider: usedProvider,
    intent: intentInfo.intent,
    sources,
    fallbackUsed: usedProvider !== provider,
  };
}
