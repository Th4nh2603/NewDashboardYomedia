import type { AgentContext } from "../../ai/runtime/agent-context.js";
import type { ChatAgentResult } from "../../ai/agents/orchestrator/orchestrator.types.js";
import { GeneralAgent } from "../../ai/agents/general/general.agent.js";
import { IntentAgent } from "../../ai/agents/intent/intent.agent.js";
import { OrchestratorAgent } from "../../ai/agents/orchestrator/orchestrator.agent.js";
import { RagAgent } from "../../ai/agents/rag/rag.agent.js";
import { ResponseAgent } from "../../ai/agents/response/response.agent.js";
import { SqlAgent } from "../../ai/agents/sql/sql.agent.js";
import { ToolAgent } from "../../ai/agents/tools/tool.agent.js";
import { mapChatResultToDto } from "./chat.mapper.js";
import { chatPolicy } from "./chat.policy.js";
import type {
  ChatInternalResult,
  ChatResponseDto,
  ChatServiceInput,
} from "./chat.types.js";

export interface ChatOrchestrator {
  execute(context: AgentContext): Promise<ChatAgentResult>;
}

export class ChatService {
  constructor(private readonly orchestrator?: ChatOrchestrator) {}

  async sendMessage({ input, auth }: ChatServiceInput): Promise<ChatResponseDto> {
    const scope = chatPolicy.buildExecutionScope(auth, input);
    const conversationId = input.conversationId ?? crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const agentContext: AgentContext = {
      userId: scope.userId,
      tenantId: scope.tenantId,
      permissions: scope.permissions,
      allowedBrandIds: scope.allowedBrandIds,
      allowedKnowledgeBaseIds: scope.allowedKnowledgeBaseIds,
      allowedMcpTools: scope.allowedMcpTools,
      conversationId,
      message: input.message,
      requestedBrandId: scope.requestedBrandId,
      requestedKnowledgeBaseId: scope.requestedKnowledgeBaseId,
      pageContext: input.pageContext,
    };

    if (!this.orchestrator) {
      return mapChatResultToDto({
        conversationId,
        messageId,
        answer: "AI orchestration is not configured yet.",
        sources: [],
        toolCalls: [],
        steps: [
          {
            agent: "chat-service",
            action: "orchestrator configuration check",
            status: "failed",
          },
        ],
      });
    }

    const result = await this.orchestrator.execute(agentContext);
    const internalResult: ChatInternalResult = {
      conversationId,
      messageId,
      answer: result.answer,
      data: result.data,
      sources: result.sources,
      toolCalls: result.toolCalls,
      steps: result.steps,
    };

    return mapChatResultToDto(internalResult);
  }
};

export const chatService = new ChatService(
  new OrchestratorAgent(
    new IntentAgent(),
    new GeneralAgent(),
    new RagAgent(),
    new SqlAgent(),
    new ToolAgent(),
    new ResponseAgent(),
  ),
);
