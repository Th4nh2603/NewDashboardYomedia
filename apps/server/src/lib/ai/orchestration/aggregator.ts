import type { AgentResult } from "../core/types.js";

export type RankedResult = AgentResult & { score: number };

export function rankAgentResults(results: AgentResult[]): RankedResult[] {
  return results
    .map((r) => ({
      ...r,
      score:
        (r.ok ? 1 : 0) * 0.5 +
        Math.max(0, Math.min(1, r.confidence)) * 0.3 +
        (r.sources.length > 0 ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score);
}

const AGENT_LABELS: Record<string, string> = {
  sql: "SQL",
  dashboard: "Dashboard",
  rag: "Knowledge",
  actions: "Actions",
  free_chat: "Chat",
};

export function mergeAgentAnswers(
  results: AgentResult[],
  order?: string[],
): string {
  if (!results.length) {
    return "Không có kết quả từ các agent.";
  }
  if (results.length === 1) return results[0].answer;
  const ordered = order?.length
    ? order
        .map((agent) => results.find((r) => r.agent === agent))
        .filter((r): r is AgentResult => Boolean(r))
    : results;
  return ordered
    .map((r) => {
      const label = AGENT_LABELS[r.agent] || r.agent;
      return `### ${label}\n${r.answer}`;
    })
    .join("\n\n");
}

