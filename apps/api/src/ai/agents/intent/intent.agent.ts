import type { AgentContext } from "../../runtime/agent-context.js";
import type { IntentResult } from "../orchestrator/orchestrator.types.js";

function normalizeMessage(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(message: string, keywords: string[]): boolean {
  return keywords.some((keyword) => message.includes(keyword));
}

export class IntentAgent {
  async detect(context: AgentContext): Promise<IntentResult> {
    const message = normalizeMessage(context.message);

    if (
      includesAny(message, [
        "upload demo",
        "build demo",
        "delete demo",
        "remove demo",
        "xoa demo",
        "setup banner",
        "create banner",
        "tao banner",
        "sftp",
        "tool",
        "create file",
        "tao file",
        "campaign",
      ])
    ) {
      return {
        intent: "tool",
        confidence: 0.9,
        reason: "User asked for a system action or tool workflow.",
      };
    }

    if (
      includesAny(message, [
        "report",
        "thong ke",
        "so lieu",
        "doanh thu",
        "revenue",
        "campaign performance",
        "performance",
        "dashboard data",
        "database",
        "sql",
        "count",
        "metric",
      ])
    ) {
      return {
        intent: "sql",
        confidence: 0.85,
        reason: "User asked for structured data, reporting, or statistics.",
      };
    }

    if (
      includesAny(message, [
        "document",
        "docs",
        "knowledge base",
        "file",
        "citation",
        "cite",
        "source",
        "policy",
        "guideline",
        "tai lieu",
        "nguon",
        "trich dan",
        "dua tren",
        "noi dung da upload",
      ])
    ) {
      return {
        intent: "rag",
        confidence: 0.88,
        reason: "User asked for document-grounded knowledge or uploaded content.",
      };
    }

    return {
      intent: "general",
      confidence: 0.65,
      reason: "No document, data, or tool workflow intent was detected.",
    };
  }
}
