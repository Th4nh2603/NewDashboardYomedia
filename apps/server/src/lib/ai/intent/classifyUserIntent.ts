import type { UserIntentClassification, UserIntentLabel } from "./types.js";

type GenerateTextFn = (params: {
  provider: "gemini" | "openai";
  apiKey: string;
  prompt: string;
  timeoutMs?: number;
  systemPrompt?: string;
}) => Promise<string>;

function parseIntentJson(raw: string): UserIntentClassification | null {
  if (!raw.trim()) return null;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<UserIntentClassification>;
    const label = String(parsed.label || "").trim() as UserIntentLabel;
    const confidence = Number(parsed.confidence);
    const reason = String(parsed.reason || "").trim();
    const validLabels: UserIntentLabel[] = [
      "knowledge_qa",
      "action_request",
      "hybrid",
      "clarification_needed",
      "unsupported",
    ];
    if (!validLabels.includes(label)) return null;
    if (!Number.isFinite(confidence)) return null;
    return {
      label,
      confidence: Math.max(0, Math.min(1, confidence)),
      reason: reason || "No reason provided",
    };
  } catch {
    return null;
  }
}

export async function classifyUserIntent(params: {
  question: string;
  provider: "gemini" | "openai";
  apiKey: string;
  generateText: GenerateTextFn;
}): Promise<UserIntentClassification> {
  const fallback: UserIntentClassification = {
    label: "knowledge_qa",
    confidence: 0.5,
    reason: "Fallback classification",
  };
  const prompt = [
    "You are an intent classifier for an internal assistant.",
    "Classify the user query into exactly one label:",
    "- knowledge_qa: asks for policy/docs/how-to explanations only.",
    "- action_request: asks to execute a concrete operation/tool.",
    "- hybrid: needs both KB lookup + action execution.",
    "- clarification_needed: missing required information.",
    "- unsupported: out of scope request.",
    "",
    "Return strict JSON only:",
    '{"label":"knowledge_qa|action_request|hybrid|clarification_needed|unsupported","confidence":0.0,"reason":"short reason"}',
    "",
    "User query:",
    params.question,
  ].join("\n");

  try {
    const raw = await params.generateText({
      provider: params.provider,
      apiKey: params.apiKey,
      prompt,
      timeoutMs: 8000,
    });
    return parseIntentJson(raw) ?? fallback;
  } catch {
    return fallback;
  }
}
