import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult, ChatAgentResult } from "../orchestrator/orchestrator.types.js";
import type { RagChatResponseDto } from "../../../rag/rag.types.js";

function isRagResponse(value: unknown): value is RagChatResponseDto {
  return (
    typeof value === "object" &&
    value !== null &&
    "answer" in value &&
    "sources" in value &&
    "steps" in value
  );
}

export class ResponseAgent {
  async execute(input: {
    context: AgentContext;
    agentResults: AgentResult[];
  }): Promise<ChatAgentResult> {
    const ragResult = input.agentResults.find((result) => result.agent === "rag");
    if (ragResult && isRagResponse(ragResult.output)) {
      return {
        answer: ragResult.output.answer,
        sources: ragResult.output.sources,
        toolCalls: [],
        steps: ragResult.output.steps,
      };
    }

    return {
      answer: "AI orchestration is not configured yet.",
      sources: [],
      toolCalls: [],
      steps: [
        {
          name: "rag.answer.generate",
          status: "skipped",
          summary: "No document-grounded RAG result was produced.",
        },
      ],
    };
  }
}
