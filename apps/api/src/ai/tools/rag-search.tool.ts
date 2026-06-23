import type { AgentTool } from "./tool.interface.js";
import { ragService } from "../../rag/rag.service.js";

export const ragSearchTool: AgentTool = {
  name: "rag-search",
  description: "Search the scoped knowledge base.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
    },
    required: ["query"],
  },
  async execute(input, context) {
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (!query) {
      throw new Error("rag-search requires a non-empty query.");
    }
    if (
      !context.tenantId ||
      !context.allowedBrandIds ||
      !context.allowedKnowledgeBaseIds
    ) {
      throw new Error("rag-search requires scoped agent context.");
    }

    return ragService.answerFromDocuments({
      query,
      scope: {
        userId: context.userId,
        tenantId: context.tenantId,
        allowedBrandIds: context.allowedBrandIds,
        allowedKnowledgeBaseIds: context.allowedKnowledgeBaseIds,
        requestedBrandId: context.requestedBrandId,
        requestedKnowledgeBaseId: context.requestedKnowledgeBaseId,
      },
    });
  },
};
