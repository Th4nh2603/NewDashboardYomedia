import type { AgentContext } from "./agent-context.js";
import type {
  AuthenticatedChatContext,
  ChatRequest,
} from "../../modules/chat/chat.types.js";
import { chatPolicy } from "../../modules/chat/chat.policy.js";

export interface BuiltAgentContext {
  context: AgentContext;
  conversationId: string;
}

export class AgentContextBuilder {
  build(input: {
    auth: AuthenticatedChatContext;
    request: ChatRequest;
    requestId?: string;
  }): BuiltAgentContext {
    const scope = chatPolicy.buildExecutionScope(input.auth, input.request);
    const conversationId = input.request.conversationId ?? crypto.randomUUID();

    return {
      conversationId,
      context: {
        userId: scope.userId,
        tenantId: scope.tenantId,
        permissions: scope.permissions,
        allowedBrandIds: scope.allowedBrandIds,
        allowedKnowledgeBaseIds: scope.allowedKnowledgeBaseIds,
        allowedMcpTools: scope.allowedMcpTools,
        allowedToolCapabilities: scope.allowedToolCapabilities,
        allowedBuildDemoBrands: scope.allowedBuildDemoBrands,
        conversationId,
        requestId: input.requestId,
        message: input.request.message,
        requestedBrandId: scope.requestedBrandId,
        requestedKnowledgeBaseId: scope.requestedKnowledgeBaseId,
        pageContext: input.request.pageContext,
        provider: input.request.provider,
        attachments: input.request.attachments,
      },
    };
  }
}
