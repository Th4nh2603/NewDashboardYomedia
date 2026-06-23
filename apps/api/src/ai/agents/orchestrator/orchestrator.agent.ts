import type { AgentContext } from "../../runtime/agent-context.js";
import type { GeneralAgent } from "../general/general.agent.js";
import type { IntentAgent } from "../intent/intent.agent.js";
import type { RagAgent } from "../rag/rag.agent.js";
import type { ResponseAgent } from "../response/response.agent.js";
import type { SqlAgent } from "../sql/sql.agent.js";
import type { ToolAgent } from "../tools/tool.agent.js";
import type { AgentResult, ChatAgentResult } from "./orchestrator.types.js";

export class OrchestratorAgent {
  constructor(
    private readonly intentAgent: IntentAgent,
    private readonly generalAgent: GeneralAgent,
    private readonly ragAgent: RagAgent,
    private readonly sqlAgent: SqlAgent,
    private readonly toolAgent: ToolAgent,
    private readonly responseAgent: ResponseAgent,
  ) {}

  async execute(context: AgentContext): Promise<ChatAgentResult> {
    const intentResult = await this.intentAgent.detect(context);
    const agentResults: AgentResult[] = [];
    const steps: unknown[] = [
      {
        name: "intent.detect",
        status: "success",
        summary: intentResult.reason,
        data: {
          intent: intentResult.intent,
          confidence: intentResult.confidence,
        },
      },
      {
        name: "agent.route",
        status: "success",
        summary: `Routed chat request to ${intentResult.intent} agent.`,
        data: {
          agent: intentResult.intent,
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
        agentResults.push(await this.toolAgent.execute(context));
        break;
    }

    return this.responseAgent.execute({
      context,
      agentResults,
      intent: intentResult,
      steps,
    });
  }
}
