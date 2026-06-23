import type { AgentContext } from "../../runtime/agent-context.js";
import type {
  AgentResult,
  ChatAgentResult,
  IntentResult,
} from "../orchestrator/orchestrator.types.js";
import type { RagChatResponseDto } from "../../../rag/rag.types.js";

const insufficientContextAnswer =
  "Em chưa tìm thấy đủ thông tin trong tài liệu được phép truy cập để trả lời chắc chắn.";

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
    intent: IntentResult;
    steps: unknown[];
  }): Promise<ChatAgentResult> {
    const agentSteps = input.agentResults.flatMap((result) => result.steps ?? []);
    const ragResult = input.agentResults.find((result) => result.agent === "rag");
    if (ragResult && isRagResponse(ragResult.output)) {
      return {
        answer: ragResult.output.insufficientContext
          ? insufficientContextAnswer
          : ragResult.output.answer,
        intent: input.intent.intent,
        agent: "rag",
        sources: ragResult.output.sources,
        toolCalls: [],
        steps: [
          ...input.steps,
          ...ragResult.output.steps,
          {
            name: "response.normalize",
            status: "success",
            summary: "Normalized RAG agent output for chat response.",
          },
        ],
        insufficientContext: ragResult.output.insufficientContext,
      };
    }

    const primaryResult = input.agentResults[0];
    const primaryOutput =
      typeof primaryResult?.output === "object" && primaryResult.output !== null
        ? (primaryResult.output as Record<string, unknown>)
        : {};
    const answer =
      typeof primaryOutput.answer === "string"
        ? primaryOutput.answer
        : "Mình chưa tạo được câu trả lời phù hợp cho yêu cầu này.";

    return {
      answer,
      intent: input.intent.intent,
      agent: primaryResult?.agent,
      data: primaryOutput.data,
      action:
        typeof primaryOutput.action === "object" && primaryOutput.action !== null
          ? (primaryOutput.action as ChatAgentResult["action"])
          : undefined,
      sources: [],
      toolCalls: Array.isArray(primaryOutput.toolCalls)
        ? primaryOutput.toolCalls
        : [],
      steps: [
        ...input.steps,
        ...agentSteps,
        {
          name: "response.normalize",
          status: "success",
          summary: "Normalized agent output for chat response.",
        },
      ],
    };
  }
}
