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
        primaryTask: "demo_or_tool_workflow",
        confidence: 0.9,
        selectedAgent: "DemoAgent",
        neededCapabilities: ["demo-sftp", "tool-gateway"],
        riskLevel: "high",
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
        primaryTask: "structured_report",
        confidence: 0.85,
        selectedAgent: "SqlAgent",
        neededCapabilities: ["read-only-sql"],
        riskLevel: "medium",
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
        primaryTask: "document_answer",
        confidence: 0.88,
        selectedAgent: "RagAgent",
        neededCapabilities: ["rag-retrieval", "citations"],
        riskLevel: "low",
        reason: "User asked for document-grounded knowledge or uploaded content.",
      };
    }

    return {
      intent: "general",
      primaryTask: "general_answer",
      confidence: 0.65,
      selectedAgent: "GeneralAgent",
      neededCapabilities: ["llm"],
      riskLevel: "low",
      reason: "No document, data, or tool workflow intent was detected.",
    };
  }
}
