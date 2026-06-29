import type { AgentContext } from "../runtime/agent-context.js";
import type {
  ApprovalHandler,
} from "../hitl/approval-handler.js";
import { PolicyGate } from "../../policy/policy-gate.js";
import type {
  ToolCallRequest,
  ToolCallResult,
  ToolExecutionResult,
  ToolRegistry,
} from "./tool-registry.js";
import { ToolExecutor } from "./tool-executor.js";

export class ToolGateway {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly policyGate = new PolicyGate(),
    private readonly executor = new ToolExecutor(),
  ) {}

  async call(
    request: ToolCallRequest,
    context: AgentContext,
    approvalHandler: ApprovalHandler,
  ): Promise<ToolCallResult> {
    const startedAt = Date.now();
    const tool = this.registry.get(request.name);
    if (!tool) {
      return this.toCallResult(request.name, startedAt, false, {
        status: "failed",
        summary: `Tool ${request.name} is not registered.`,
      });
    }

    const parsed = tool.inputSchema.safeParse(request.input);
    if (!parsed.success) {
      return this.toCallResult(tool.name, startedAt, tool.requiresApproval, {
        status: "failed",
        summary: "Tool input validation failed.",
        data: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    const decision = this.policyGate.decideToolExecution(
      tool,
      parsed.data,
      context,
    );
    if (decision.decision === "deny") {
      return this.toCallResult(tool.name, startedAt, tool.requiresApproval, {
        status: "failed",
        summary: decision.reason,
      });
    }

    if (decision.decision === "requiresApproval") {
      const approval = await approvalHandler.requestApproval({
        toolName: tool.name,
        reason: decision.reason,
        input: parsed.data,
        context,
      });
      return this.toCallResult(tool.name, startedAt, true, {
        status: "approval_required",
        summary: `Tool ${tool.name} requires human approval before execution.`,
        approval,
      });
    }

    return this.toCallResult(
      tool.name,
      startedAt,
      false,
      await this.executor.execute(tool, parsed.data, context),
    );
  }

  async executeApproved(
    request: ToolCallRequest,
    context: AgentContext,
  ): Promise<ToolCallResult> {
    const startedAt = Date.now();
    const tool = this.registry.get(request.name);
    if (!tool) {
      return this.toCallResult(request.name, startedAt, false, {
        status: "failed",
        summary: `Tool ${request.name} is not registered.`,
      });
    }

    const parsed = tool.inputSchema.safeParse(request.input);
    if (!parsed.success) {
      return this.toCallResult(tool.name, startedAt, tool.requiresApproval, {
        status: "failed",
        summary: "Tool input validation failed.",
        data: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    const decision = this.policyGate.decideToolExecution(
      tool,
      parsed.data,
      context,
    );
    if (decision.decision === "deny") {
      return this.toCallResult(tool.name, startedAt, tool.requiresApproval, {
        status: "failed",
        summary: decision.reason,
      });
    }

    return this.toCallResult(
      tool.name,
      startedAt,
      tool.requiresApproval,
      await this.executor.execute(tool, parsed.data, context),
    );
  }

  private toCallResult(
    toolName: string,
    startedAt: number,
    requiresApproval: boolean,
    result: ToolExecutionResult,
  ): ToolCallResult {
    return {
      toolName,
      result,
      record: {
        serverName: "backend",
        toolName,
        status: result.status,
        durationMs: Date.now() - startedAt,
        requiresApproval,
        approvalId: result.approval?.id,
        summary: result.summary,
      },
    };
  }
}
