export interface CreateConversationInput {
  tenantId: string;
  userId: string;
  brandId?: string;
  knowledgeBaseId?: string;
}

export interface CreateMessageInput {
  tenantId: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
}

export interface CreateTraceInput {
  tenantId: string;
  conversationId: string;
  messageId: string;
  steps: unknown[];
  toolCalls: unknown[];
}

function notImplemented(operation: string): never {
  throw new Error(`Chat repository ${operation} is not implemented yet.`);
}

export const chatRepository = {
  async createConversation(_input: CreateConversationInput): Promise<never> {
    return notImplemented("createConversation");
  },

  async createMessage(_input: CreateMessageInput): Promise<never> {
    return notImplemented("createMessage");
  },

  async createTrace(_input: CreateTraceInput): Promise<never> {
    return notImplemented("createTrace");
  },
};
