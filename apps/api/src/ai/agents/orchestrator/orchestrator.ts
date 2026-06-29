import type { AgentContext } from "../../runtime/agent-context.js";
import type { LlmProvider } from "../../providers/llm-provider.interface.js";
import type {
  ApprovalHandler,
  ApprovalRequiredDto,
} from "../../hitl/approval-handler.js";
import type {
  ToolCallRequest,
  ToolCallResult,
  ToolRegistry,
} from "../../tools/tool-registry.js";

export interface OrchestratorPlanningAgent {
  name: string;
  plan(input: {
    userQuery: string;
    context: AgentContext;
    toolResults: ToolCallResult[];
  }): Promise<{
    answer?: string;
    toolCall?: ToolCallRequest;
    action?: {
      tool: string;
      [key: string]: unknown;
    };
  }>;
}

export interface OrchestratorRunResult {
  answer: string;
  steps: unknown[];
  toolCalls: unknown[];
  approvals: ApprovalRequiredDto[];
  action?: {
    tool: string;
    [key: string]: unknown;
  };
}

export interface OrchestratorOptions {
  maxSteps?: number;
  llmProvider?: LlmProvider;
}

function stringifyToolResult(toolResult: ToolCallResult): string {
  return JSON.stringify(
    {
      toolName: toolResult.toolName,
      status: toolResult.result.status,
      summary: toolResult.result.summary,
      data: toolResult.result.data,
      approval: toolResult.result.approval
        ? {
            id: toolResult.result.approval.id,
            status: toolResult.result.approval.status,
            toolName: toolResult.result.approval.toolName,
            reason: toolResult.result.approval.reason,
            inputSummary: toolResult.result.approval.inputSummary,
          }
        : undefined,
    },
    null,
    2,
  );
}

function fallbackAnswer(toolResult: ToolCallResult | undefined): string {
  if (!toolResult) {
    return "I could not produce a tool result for this request.";
  }
  if (toolResult.result.status === "approval_required") {
    return `This request needs approval before running ${toolResult.toolName}.`;
  }
  return toolResult.result.summary;
}

export class Orchestrator {
  constructor(
    private readonly tools: ToolRegistry,
    private readonly approvalHandler: ApprovalHandler,
    private readonly options: OrchestratorOptions = {},
  ) {}

  async run(
    agent: OrchestratorPlanningAgent,
    userQuery: string,
    context: AgentContext,
  ): Promise<OrchestratorRunResult> {
    const maxSteps = this.options.maxSteps ?? 6;
    const steps: unknown[] = [
      {
        name: "orchestrator.start",
        status: "success",
        summary: `Started orchestrator loop with maxSteps=${maxSteps}.`,
      },
    ];
    const toolResults: ToolCallResult[] = [];
    const approvals: ApprovalRequiredDto[] = [];
    let lastAction: OrchestratorRunResult["action"];
    let answer: string | undefined;

    for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex += 1) {
      const plan = await agent.plan({ userQuery, context, toolResults });
      steps.push({
        name: "orchestrator.plan",
        status: "success",
        summary: `Planner ${agent.name} returned ${
          plan.toolCall ? `tool ${plan.toolCall.name}` : "a final answer"
        }.`,
        data: { stepIndex, toolName: plan.toolCall?.name },
      });

      if (!plan.toolCall) {
        answer = plan.answer;
        lastAction = plan.action;
        break;
      }

      const toolCall = await this.tools.call(
        plan.toolCall,
        context,
        this.approvalHandler,
      );
      toolResults.push(toolCall);
      if (toolCall.result.approval) {
        approvals.push(toolCall.result.approval);
      }
      steps.push({
        name: toolCall.toolName === "load_skill" ? "skill.loaded" : "tool.call",
        status: toolCall.result.status,
        summary: toolCall.result.summary,
        durationMs: toolCall.record.durationMs,
        data: {
          toolName: toolCall.toolName,
          approvalId: toolCall.result.approval?.id,
        },
      });
      if (toolCall.result.approval) {
        steps.push({
          name: "approval.requested",
          status: "approval_required",
          summary: `Requested approval for ${toolCall.toolName}.`,
          data: {
            toolName: toolCall.toolName,
            approvalId: toolCall.result.approval.id,
          },
        });
      }

      const finalAnswer = await this.answerFromToolResult(userQuery, toolCall);
      steps.push({
        name: "tool.result",
        status: "success",
        summary: "Returned tool result to the LLM/finalizer before responding.",
      });
      answer = finalAnswer;
      lastAction = {
        tool: toolCall.toolName,
        result: toolCall.result.data,
        requiresApproval: toolCall.result.status === "approval_required",
        approval: toolCall.result.approval,
      };
      break;
    }

    if (!answer) {
      answer = "The agent reached the maximum step limit before completing.";
      steps.push({
        name: "orchestrator.max_steps",
        status: "failed",
        summary: `Stopped after ${maxSteps} steps to avoid an infinite loop.`,
      });
    }

    return {
      answer,
      steps: [
        ...steps,
        {
          name: "orchestrator.final",
          status: "success",
          summary: "Prepared final answer from orchestrator output.",
        },
      ],
      toolCalls: toolResults.map((toolResult) => toolResult.record),
      approvals,
      action: lastAction,
    };
  }

  private async answerFromToolResult(
    userQuery: string,
    toolResult: ToolCallResult,
  ): Promise<string> {
    const provider = this.options.llmProvider;
    if (!provider) return fallbackAnswer(toolResult);

    try {
      return await provider.complete(
        [
          "You are YoMedia's backend chat finalizer.",
          "Use the sanitized tool result to answer the user.",
          "If approval is required, clearly say approval is required and do not claim the action ran.",
          "Keep the answer concise and use the user's language where possible.",
          "",
          `User query: ${userQuery}`,
          "",
          "Sanitized tool result:",
          stringifyToolResult(toolResult),
        ].join("\n"),
      );
    } catch {
      return fallbackAnswer(toolResult);
    }
  }
}
