import type { AgentContext } from "../../ai/runtime/agent-context.js";
import { AgentContextBuilder } from "../../ai/runtime/agent-context-builder.js";
import type { ChatAgentResult } from "../../ai/agents/orchestrator/orchestrator.types.js";
import { GeneralAgent } from "../../ai/agents/general/general.agent.js";
import { PlaceholderApprovalHandler } from "../../ai/hitl/approval-handler.js";
import { IntentAgent } from "../../ai/agents/intent/intent.agent.js";
import { OrchestratorAgent } from "../../ai/agents/orchestrator/orchestrator.agent.js";
import { RagAgent } from "../../ai/agents/rag/rag.agent.js";
import { ResponseAgent } from "../../ai/agents/response/response.agent.js";
import { SqlAgent } from "../../ai/agents/sql/sql.agent.js";
import { ToolAgent } from "../../ai/agents/tools/tool.agent.js";
import { GeminiProvider } from "../../ai/providers/gemini.provider.js";
import type { LlmProvider } from "../../ai/providers/llm-provider.interface.js";
import { OpenAiProvider } from "../../ai/providers/openai.provider.js";
import { SkillRegistry } from "../../ai/skills/skill-registry.js";
import { createDefaultToolRegistry } from "../../ai/tools/tool-registry.js";
import { aiConfig } from "../../config/ai.js";
import { logSteps } from "../../observability/step-logger.js";
import {
  normalizeApprovals,
  normalizeSources,
  normalizeSteps,
  normalizeToolCalls,
} from "../../response/response-normalizer.js";
import { logger } from "../../shared/logger/logger.js";
import { mapChatResultToDto } from "./chat.mapper.js";
import type {
  ChatInternalResult,
  ChatResponseDto,
  ChatServiceInput,
} from "./chat.types.js";
import { fileURLToPath } from "node:url";

export interface ChatOrchestrator {
  execute(context: AgentContext): Promise<ChatAgentResult>;
}

type ProviderName = "gemini" | "openai";

function getErrorSummary(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown chat flow error.";
}

export class ChatService {
  constructor(
    private readonly orchestrator?: ChatOrchestrator,
    private readonly contextBuilder = new AgentContextBuilder(),
  ) {}

  async sendMessage({
    input,
    auth,
    requestId,
  }: ChatServiceInput): Promise<ChatResponseDto> {
    const builtContext = this.contextBuilder.build({
      auth,
      request: input,
      requestId,
    });
    const agentContext = builtContext.context;
    const conversationId = builtContext.conversationId;
    const messageId = crypto.randomUUID();
    const flowLogMeta = { conversationId, messageId, requestId };

    logger.info("[chat.flow.start]", {
      event: "chat.flow.start",
      requestId,
      conversationId,
      messageId,
      provider: input.provider,
      messageLength: input.message.length,
      attachmentCount: input.attachments?.length ?? 0,
      hasPageContext: input.pageContext !== undefined,
    });

    if (!this.orchestrator) {
      const result = mapChatResultToDto({
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
      logSteps(flowLogMeta, result.steps ?? []);
      return result;
    }

    let result: ChatAgentResult;
    try {
      result = await this.orchestrator.execute(agentContext);
    } catch (error) {
      logger.error("[chat.flow.failed]", {
        event: "chat.flow.failed",
        requestId,
        conversationId,
        messageId,
        provider: input.provider,
        error: getErrorSummary(error),
      });
      throw error;
    }

    const steps = [
      {
        name: "request.received",
        status: "success",
        summary: "Received chat.sendMessage request.",
      },
      {
        name: "scope.resolved",
        status: "success",
        summary: "Built backend execution scope for chat orchestration.",
      },
      {
        name: "conversation.resolved",
        status: "success",
        summary: input.conversationId
          ? "Reused frontend-provided conversationId after backend scope resolution."
          : "Created a new backend conversationId for this chat session.",
      },
      ...result.steps,
      {
        name: "chat.flow.complete",
        status: "success",
        summary: "Completed chat flow and prepared ChatResponseDto.",
      },
    ];
    const internalResult: ChatInternalResult = {
      conversationId,
      messageId,
      answer: result.answer,
      intent: result.intent,
      agent: result.agent,
      data: result.data,
      sources: normalizeSources(result.sources),
      toolCalls: normalizeToolCalls(result.toolCalls),
      approvals: normalizeApprovals(result.approvals),
      steps: normalizeSteps(steps),
      action: result.action,
      insufficientContext: result.insufficientContext,
    };

    logSteps(flowLogMeta, steps);
    logger.info("[chat.flow.complete]", {
      event: "chat.flow.complete",
      requestId,
      conversationId,
      messageId,
      provider: input.provider,
      intent: result.intent,
      agent: result.agent,
      sourceCount: result.sources.length,
      toolCallCount: result.toolCalls.length,
      insufficientContext: result.insufficientContext,
    });

    return mapChatResultToDto(internalResult);
  }
}

const providerMap: Partial<Record<ProviderName, LlmProvider>> = {
  gemini: new GeminiProvider(aiConfig.geminiApiKey, aiConfig.geminiModel),
  openai: new OpenAiProvider(aiConfig.openaiApiKey, aiConfig.openaiModel),
};

const skillRoot = fileURLToPath(
  new URL("../../../../../skills", import.meta.url),
);

export const chatService = new ChatService(
  new OrchestratorAgent(
    new IntentAgent(),
    new GeneralAgent(providerMap),
    new RagAgent(),
    new SqlAgent(),
    new ToolAgent(),
    new ResponseAgent(),
    {
      toolRegistry: createDefaultToolRegistry(),
      skillRegistry: new SkillRegistry(skillRoot),
      approvalHandler: new PlaceholderApprovalHandler(),
      maxSteps: 6,
      getLlmProvider: (context) => providerMap[context.provider ?? "gemini"],
    },
  ),
);
