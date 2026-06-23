import type { AgentContext } from "../../ai/runtime/agent-context.js";
import type { ChatAgentResult } from "../../ai/agents/orchestrator/orchestrator.types.js";
import { GeneralAgent } from "../../ai/agents/general/general.agent.js";
import { IntentAgent } from "../../ai/agents/intent/intent.agent.js";
import { OrchestratorAgent } from "../../ai/agents/orchestrator/orchestrator.agent.js";
import { RagAgent } from "../../ai/agents/rag/rag.agent.js";
import { ResponseAgent } from "../../ai/agents/response/response.agent.js";
import { SqlAgent } from "../../ai/agents/sql/sql.agent.js";
import { ToolAgent } from "../../ai/agents/tools/tool.agent.js";
import { GeminiProvider } from "../../ai/providers/gemini.provider.js";
import { OpenAiProvider } from "../../ai/providers/openai.provider.js";
import { aiConfig } from "../../config/ai.js";
import { logger } from "../../shared/logger/logger.js";
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

interface ChatFlowLogMeta {
  conversationId: string;
  messageId: string;
  requestId?: string;
}

function asStepRecord(step: unknown): Record<string, unknown> {
  return typeof step === "object" && step !== null
    ? (step as Record<string, unknown>)
    : {};
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function truncateSummary(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > 240 ? `${value.slice(0, 237)}...` : value;
}

function getStepName(step: Record<string, unknown>): string {
  const name = asOptionalString(step.name);
  if (name) return name;

  const agent = asOptionalString(step.agent);
  const action = asOptionalString(step.action);
  if (agent && action) return `${agent}.${action}`;
  if (agent) return agent;
  return "chat.step";
}

function logChatFlowStep(
  meta: ChatFlowLogMeta,
  step: unknown,
  stepIndex: number,
): void {
  const stepRecord = asStepRecord(step);
  logger.info("[chat.flow.step]", {
    event: "chat.flow.step",
    requestId: meta.requestId,
    conversationId: meta.conversationId,
    messageId: meta.messageId,
    stepIndex,
    stepName: getStepName(stepRecord),
    status: asOptionalString(stepRecord.status),
    summary: truncateSummary(stepRecord.summary),
    durationMs:
      typeof stepRecord.durationMs === "number" ? stepRecord.durationMs : undefined,
  });
}

function logChatFlowSteps(meta: ChatFlowLogMeta, steps: unknown[]): void {
  steps.forEach((step, index) => logChatFlowStep(meta, step, index + 1));
}

function getErrorSummary(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown chat flow error.";
}

export class ChatService {
  constructor(private readonly orchestrator?: ChatOrchestrator) {}

  async sendMessage({
    input,
    auth,
    requestId,
  }: ChatServiceInput): Promise<ChatResponseDto> {
    const scope = chatPolicy.buildExecutionScope(auth, input);
    const conversationId = input.conversationId ?? crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const flowLogMeta = { conversationId, messageId, requestId };
    const agentContext: AgentContext = {
      userId: scope.userId,
      tenantId: scope.tenantId,
      permissions: scope.permissions,
      allowedBrandIds: scope.allowedBrandIds,
      allowedKnowledgeBaseIds: scope.allowedKnowledgeBaseIds,
      allowedMcpTools: scope.allowedMcpTools,
      conversationId,
      requestId,
      message: input.message,
      requestedBrandId: scope.requestedBrandId,
      requestedKnowledgeBaseId: scope.requestedKnowledgeBaseId,
      pageContext: input.pageContext,
      provider: input.provider,
      attachments: input.attachments,
    };

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
      logChatFlowSteps(flowLogMeta, result.steps ?? []);
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
        name: "chat.request.received",
        status: "success",
        summary: "Received chat.sendMessage request.",
      },
      {
        name: "auth.scope.resolve",
        status: "success",
        summary: "Built backend execution scope for chat orchestration.",
      },
      ...result.steps,
    ];
    const internalResult: ChatInternalResult = {
      conversationId,
      messageId,
      answer: result.answer,
      intent: result.intent,
      agent: result.agent,
      data: result.data,
      sources: result.sources,
      toolCalls: result.toolCalls,
      steps,
      action: result.action,
      insufficientContext: result.insufficientContext,
    };

    logChatFlowSteps(flowLogMeta, steps);
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

export const chatService = new ChatService(
  new OrchestratorAgent(
    new IntentAgent(),
    new GeneralAgent({
      gemini: new GeminiProvider(aiConfig.geminiApiKey, aiConfig.geminiModel),
      openai: new OpenAiProvider(aiConfig.openaiApiKey, aiConfig.openaiModel),
    }),
    new RagAgent(),
    new SqlAgent(),
    new ToolAgent(),
    new ResponseAgent(),
  ),
);
