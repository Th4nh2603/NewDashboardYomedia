import type { AgentContext } from "../../runtime/agent-context.js";
import { buildScopedMemorySummary } from "../../../observability/memory-summarizer.js";
import type { LlmProvider } from "../../providers/llm-provider.interface.js";
import { agentRegistry } from "../../registry/agent.registry.js";
import type { ApprovalHandler } from "../../hitl/approval-handler.js";
import type { SkillRegistry } from "../../skills/skill-registry.js";
import { createLoadSkillTool } from "../../skills/skill-registry.js";
import type { ToolRegistry } from "../../tools/tool-registry.js";
import type { GeneralAgent } from "../general/general.agent.js";
import type { IntentAgent } from "../intent/intent.agent.js";
import type { RagAgent } from "../rag/rag.agent.js";
import type { ResponseAgent } from "../response/response.agent.js";
import type { SqlAgent } from "../sql/sql.agent.js";
import type { ToolAgent } from "../tools/tool.agent.js";
import { ToolAgentPlanner } from "../tools/tool-agent-planner.js";
import { Orchestrator } from "./orchestrator.js";
import type { AgentResult, ChatAgentResult } from "./orchestrator.types.js";

export interface OrchestratorAgentOptions {
  toolRegistry?: ToolRegistry;
  skillRegistry?: SkillRegistry;
  approvalHandler?: ApprovalHandler;
  maxSteps?: number;
  getLlmProvider?: (context: AgentContext) => LlmProvider | undefined;
}

export class OrchestratorAgent {
  private skillToolRegistered = false;

  constructor(
    private readonly intentAgent: IntentAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly ragAgent: RagAgent,
    private readonly sqlAgent: SqlAgent,
    private readonly toolAgent: ToolAgent,
    private readonly responseAgent: ResponseAgent,
    private readonly options: OrchestratorAgentOptions = {},
  ) {}

  async execute(context: AgentContext): Promise<ChatAgentResult> {
    const skillCatalog = await this.prepareRegistries();
    const intentResult = await this.intentAgent.detect(context);
    const selectedAgent = agentRegistry.assertRegistered(intentResult.selectedAgent);
    const agentResults: AgentResult[] = [];
    const steps: unknown[] = [
      {
        name: "memory.scoped",
        status: "success",
        summary: "Loaded scoped memory summary for this tenant/session boundary.",
        data: {
          summary: buildScopedMemorySummary(context),
        },
      },
      {
        name: "skill.catalog.preloaded",
        status: "success",
        summary: `Preloaded ${skillCatalog.length} skill catalog entr${skillCatalog.length === 1 ? "y" : "ies"} without loading full bodies.`,
        data: {
          skills: skillCatalog.map((skill) => ({
            name: skill.name,
            description: skill.description,
          })),
        },
      },
      {
        name: "intent.detected",
        status: "success",
        summary: intentResult.reason,
        data: {
          intent: intentResult.intent,
          primaryTask: intentResult.primaryTask,
          confidence: intentResult.confidence,
          selectedAgent: intentResult.selectedAgent,
          neededCapabilities: intentResult.neededCapabilities,
          riskLevel: intentResult.riskLevel,
        },
      },
      {
        name: "agent.routed",
        status: "success",
        summary: `Routed chat request to ${selectedAgent.name}.`,
        data: {
          agent: selectedAgent.name,
          capabilities: selectedAgent.capabilities,
        },
      },
    ];

    switch (intentResult.intent) {
      case "general":
        agentResults.push(await this.generalAgent.execute(context));
        break;
      case "rag":
        agentResults.push(await this.ragAgent.execute(context));
        break;
      case "sql":
        agentResults.push(await this.sqlAgent.execute(context));
        break;
      case "tool":
        agentResults.push(await this.executeToolFlow(context));
        break;
    }

    return this.responseAgent.execute({
      context,
      agentResults,
      intent: intentResult,
      steps,
    });
  }

  private async prepareRegistries(): Promise<
    Array<{ name: string; description: string }>
  > {
    if (!this.options.skillRegistry || !this.options.toolRegistry) return [];
    const catalog = await this.options.skillRegistry.preloadCatalog();
    if (!this.skillToolRegistered) {
      this.options.toolRegistry.register(
        createLoadSkillTool(this.options.skillRegistry),
      );
      this.skillToolRegistered = true;
    }
    // The catalog is intentionally preloaded without full skill bodies.
    return catalog.map((skill) => ({
      name: skill.name,
      description: skill.description,
    }));
  }

  private async executeToolFlow(context: AgentContext): Promise<AgentResult> {
    if (!this.options.toolRegistry || !this.options.approvalHandler) {
      return this.toolAgent.execute(context);
    }

    const orchestrator = new Orchestrator(
      this.options.toolRegistry,
      this.options.approvalHandler,
      {
        maxSteps: this.options.maxSteps,
        llmProvider: this.options.getLlmProvider?.(context),
      },
    );
    const result = await orchestrator.run(
      new ToolAgentPlanner(this.toolAgent),
      context.message,
      context,
    );

    return {
      agent: "tool",
      output: {
        answer: result.answer,
        toolCalls: result.toolCalls,
        approvals: result.approvals,
        action: result.action,
      },
      steps: result.steps,
    };
  }
}
