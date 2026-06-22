import type { AgentContext } from "../../runtime/agent-context.js";
import type { ChatIntent } from "../orchestrator/orchestrator.types.js";

export class IntentAgent {
  async detect(context: AgentContext): Promise<{ intents: ChatIntent[] }> {
    const message = context.message.toLowerCase();
    const requiresRag = [
      "document",
      "docs",
      "knowledge base",
      "citation",
      "cite",
      "source",
      "tài liệu",
      "nguồn",
      "trích dẫn",
      "dựa trên",
    ].some((keyword) => message.includes(keyword));

    return { intents: [requiresRag ? "RAG_SEARCH" : "GENERAL_CHAT"] };
  }
}
