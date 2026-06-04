import { detectTool } from "../actions/detectTool.js";
import type { IntentClassification } from "./types.js";

const QUESTION_STARTERS = new Set([
  "what",
  "how",
  "where",
  "why",
  "when",
  "which",
  "ai",
  "cai",
  "gi",
  "nao",
  "sao",
]);

const LOOKUP_VERBS = [
  "explain",
  "describe",
  "find",
  "show",
  "clarify",
  "define",
  "review",
  "tom tat",
  "mo ta",
  "tim",
  "chi",
  "giai thich",
];

const INTERNAL_REFERENCE_HINTS = [
  "doc",
  "document",
  "docs",
  "policy",
  "guide",
  "sop",
  "knowledge",
  "rag",
  "tai lieu",
  "quy dinh",
  "quy trinh",
  "huong dan",
];

const KNOWLEDGE_REQUEST_HINTS = [
  "cho toi",
  "cho minh",
  "cung cap",
  "gui",
  "dua",
  "xin",
  "can",
];

function toSearchableText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasAnyTerm(text: string, terms: string[], tokenSet: Set<string>): boolean {
  return terms.some((term) => {
    if (term.includes(" ")) return text.includes(term);
    return tokenSet.has(term);
  });
}

function scoreKnowledgeQaIntent(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  const tokenSet = new Set(tokens);
  let score = 0;

  const startsWithQuestion = tokens.length > 0 && QUESTION_STARTERS.has(tokens[0]);
  const hasQuestionMark = text.includes("?");
  if (startsWithQuestion || hasQuestionMark) score += 0.25;

  const hasLookupVerb = hasAnyTerm(text, LOOKUP_VERBS, tokenSet);
  if (hasLookupVerb) score += 0.25;

  const hasInternalHint = hasAnyTerm(text, INTERNAL_REFERENCE_HINTS, tokenSet);
  if (hasInternalHint) score += 0.35;

  const hasKnowledgeRequest = hasAnyTerm(text, KNOWLEDGE_REQUEST_HINTS, tokenSet);
  if (hasKnowledgeRequest && hasInternalHint) score += 0.2;

  const mentionsStructuredAsset =
    /(?:\/|\\|\.md|\.pdf|api|wiki|kb|knowledge base)/.test(text);
  if (mentionsStructuredAsset) score += 0.15;

  return Math.min(1, score);
}

/** Rule-based intent: actions (tool calls) are evaluated before knowledge_qa / free_chat. */
export function classifyUserIntent(input: string): IntentClassification {
  const normalized = toSearchableText(input);
  if (detectTool(input)) {
    return {
      intent: "actions",
      confidence: 0.95,
      reason: "Matched action/tool keyword",
    };
  }

  const knowledgeScore = scoreKnowledgeQaIntent(normalized);
  if (knowledgeScore >= 0.45) {
    return {
      intent: "knowledge_qa",
      confidence: Math.max(0.6, Math.round(knowledgeScore * 100) / 100),
      reason: "Detected question and lookup behavior for internal knowledge",
    };
  }

  return {
    intent: "free_chat",
    confidence: 0.7,
    reason: "Default to free chat",
  };
}
