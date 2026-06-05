import { detectTool } from "../tools/detectTool.js";
import type { IntentClassification } from "./types.js";
import {
  scoreDashboardIntent,
  scoreKnowledgeQaIntent,
  scoreSqlQueryIntent,
  toSearchableText,
} from "./scoring.js";

/** Rule-based intent: actions (tool calls) are evaluated before specialized agents. */
export function classifyUserIntent(input: string): IntentClassification {
  const normalized = toSearchableText(input);
  if (detectTool(input)) {
    return {
      intent: "actions",
      confidence: 0.95,
      reason: "Matched action/tool keyword",
    };
  }

  const sqlScore = scoreSqlQueryIntent(normalized);
  if (sqlScore >= 0.45) {
    return {
      intent: "sql_query",
      confidence: Math.max(0.6, Math.round(sqlScore * 100) / 100),
      reason: "Detected SQL/database lookup intent",
    };
  }

  const dashboardScore = scoreDashboardIntent(normalized);
  if (dashboardScore >= 0.45) {
    return {
      intent: "dashboard_insight",
      confidence: Math.max(0.6, Math.round(dashboardScore * 100) / 100),
      reason: "Detected dashboard/analytics intent",
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

export {
  detectAgentCandidates,
  scoreDashboardIntent,
  scoreKnowledgeQaIntent,
  scoreSqlQueryIntent,
} from "./scoring.js";
