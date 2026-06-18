import type { DashboardChatResponse } from "../../shared/dto/dashboard-chat-response.dto.js";
import type { AgentContext } from "../../ai/runtime/agent-context.js";

export interface SendMessageInput extends Omit<AgentContext, "conversationId"> {
  conversationId?: string;
}

export const chatService = {
  async sendMessage(input: SendMessageInput): Promise<DashboardChatResponse> {
    return {
      conversationId: input.conversationId ?? crypto.randomUUID(),
      messageId: crypto.randomUUID(),
      answer: "Chat orchestration is not implemented yet.",
      sources: [],
      toolCalls: [],
      steps: [],
    };
  },
};
