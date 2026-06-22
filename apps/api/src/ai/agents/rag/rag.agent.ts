import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";
import { ragService, type RagService } from "../../../rag/rag.service.js";

export class RagAgent {
  constructor(private readonly service: RagService = ragService) {}

  async execute(context: AgentContext): Promise<AgentResult> {
    const result = await this.service.answerFromDocuments({
      query: context.message,
      scope: {
        userId: context.userId,
        tenantId: context.tenantId,
        allowedBrandIds: context.allowedBrandIds,
        allowedKnowledgeBaseIds: context.allowedKnowledgeBaseIds,
        requestedBrandId: context.requestedBrandId,
        requestedKnowledgeBaseId: context.requestedKnowledgeBaseId,
      },
    });

    return { agent: "rag", output: result };
  }
}
