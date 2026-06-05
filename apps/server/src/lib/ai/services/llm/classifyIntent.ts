import type { ChatProvider } from "../../core/types.js";
import type { IntentClassification } from "../../intent/types.js";
import { logBestEffort } from "../../../logBestEffort.js";
import { callProvider } from "./callProvider.js";

const ALLOWED_INTENTS = new Set([
  "knowledge_qa",
  "free_chat",
  "sql_query",
  "dashboard_insight",
]);

function parseIntentClassifierOutput(raw: string): IntentClassification | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || normalized).trim();
  try {
    const parsed = JSON.parse(candidate) as Partial<IntentClassification>;
    if (!parsed?.intent || !ALLOWED_INTENTS.has(parsed.intent)) {
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

export async function classifyIntentWithLlm(
  provider: ChatProvider,
  question: string,
): Promise<IntentClassification | null> {
  const prompt = [
    "Classify the user intent for internal assistant routing.",
    "Return STRICT JSON only, no markdown, no extra text.",
    'Schema: {"intent":"knowledge_qa|free_chat|sql_query|dashboard_insight","confidence":0..1,"reason":"short"}',
    "",
    "Rules:",
    "- knowledge_qa: internal docs, policy, SOP, guide, process, technical reference, knowledge base.",
    "- sql_query: structured data lookup from MySQL/database tables, counts, filters, campaign/banner records.",
    "- dashboard_insight: analytics, activity summary, usage stats, recent uploads, team activity.",
    "- free_chat: general conversation/opinion/chitchat not requiring retrieval or data lookup.",
    "- Prefer knowledge_qa when uncertain between knowledge_qa and free_chat.",
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
