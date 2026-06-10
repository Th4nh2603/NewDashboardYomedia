import type { AgentName } from "../core/types.js";

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

const VIETNAMESE_QUESTION_SUFFIXES = [
  "la gi",
  "la sao",
  "la nao",
  "la the nao",
  "nhung gi",
  "gi vay",
  "the nao",
];

const YOMEDIA_KNOWLEDGE_HINTS = [
  "pub",
  "yomedia",
  "yo_page_url",
  "placement",
  "banner",
  "code mau",
  "code pub",
  "tag yo",
  "avlvar",
  "sdk",
  "truyen url",
  "noi dung",
  "ss.yomedia",
  "demo url",
  "duong dan demo",
];

const SQL_HINTS = [
  "mysql",
  "sql",
  "database",
  "db ",
  "bang du lieu",
  "trong bang",
  "truy van",
  "tra cuu",
  "query table",
  "select ",
  "from table",
  "record count",
  "du lieu campaign",
  "campaign id",
  "banner id",
  "dem so",
  "so luong",
  "bao nhieu",
];

const DASHBOARD_HINTS = [
  "thong ke",
  "analytics",
  "dashboard",
  "activity log",
  "bao cao",
  "upload gan day",
  "hoat dong gan day",
  "hoat dong upload",
  "su dung he thong",
  "summary",
  "tong hop",
  "insights",
  "metric",
  "metrics",
];

export function toSearchableText(input: string): string {
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

function hasAnyPhrase(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function scoreKnowledgeQaIntent(text: string): number {
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

  const hasVietnameseQuestion = hasAnyPhrase(text, VIETNAMESE_QUESTION_SUFFIXES);
  if (hasVietnameseQuestion) score += 0.3;

  const hasDomainHint = hasAnyPhrase(text, YOMEDIA_KNOWLEDGE_HINTS);
  if (hasDomainHint) score += 0.35;
  if (hasVietnameseQuestion && hasDomainHint) score += 0.15;

  const mentionsStructuredAsset =
    /(?:\/|\\|\.md|\.pdf|api|wiki|kb|knowledge base)/.test(text);
  if (mentionsStructuredAsset) score += 0.15;

  return Math.min(1, score);
}

export function scoreSqlQueryIntent(text: string): number {
  const normalized = toSearchableText(text);
  let score = 0;
  if (hasAnyPhrase(normalized, SQL_HINTS)) score += 0.55;
  if (/\b(select|count|sum|avg|group by|where)\b/.test(normalized)) score += 0.35;
  if (/\bmysql\b|\bsql\b/.test(normalized)) score += 0.2;
  if (/\bdem\s+so\b|\bso\s+luong\b/.test(normalized)) score += 0.35;
  if (/\bbang\s+[a-z0-9_]+/.test(normalized)) score += 0.35;
  if (/\btrong\s+bang\b/.test(normalized)) score += 0.25;
  return Math.min(1, score);
}

export function scoreDashboardIntent(text: string): number {
  const normalized = toSearchableText(text);
  let score = 0;
  if (hasAnyPhrase(normalized, DASHBOARD_HINTS)) score += 0.55;
  if (/\b(gan day|hom nay|tuan nay|thang nay|recent)\b/.test(normalized)) score += 0.2;
  if (/\b(upload|chat|build demo|user|team)\b/.test(normalized)) score += 0.15;
  return Math.min(1, score);
}

export const SQL_THRESHOLD = 0.45;
export const DASHBOARD_THRESHOLD = 0.45;
export const RAG_THRESHOLD = 0.45;

export function detectAgentCandidates(question: string): AgentName[] {
  const normalized = toSearchableText(question);
  const candidates: AgentName[] = [];

  if (scoreSqlQueryIntent(normalized) >= SQL_THRESHOLD) {
    candidates.push("sql");
  }
  if (scoreDashboardIntent(normalized) >= DASHBOARD_THRESHOLD) {
    candidates.push("dashboard");
  }
  if (scoreKnowledgeQaIntent(normalized) >= RAG_THRESHOLD) {
    candidates.push("rag");
  }

  return candidates;
}
