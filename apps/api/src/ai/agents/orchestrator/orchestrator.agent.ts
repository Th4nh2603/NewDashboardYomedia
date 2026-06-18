import type { AgentContext } from "../../runtime/agent-context.js";
import type { GeneralAgent } from "../general/general.agent.js";
import type { IntentAgent } from "../intent/intent.agent.js";
import type { RagAgent } from "../rag/rag.agent.js";
import type { ResponseAgent } from "../response/response.agent.js";
import type { SqlAgent } from "../sql/sql.agent.js";
import type { ToolAgent } from "../tools/tool.agent.js";
import type { AgentResult, ChatAgentResult } from "./orchestrator.types.js";
import { buildExecutionPlan } from "./execution-plan.builder.js";

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

    for (const intent of buildExecutionPlan(intentResult.intents)) {
      switch (intent) {
        case "GENERAL_CHAT":
          agentResults.push(await this.generalAgent.execute(context));
          break;
        case "RAG_SEARCH":
          agentResults.push(await this.ragAgent.execute(context));
          break;
        case "SQL_QUERY":
          agentResults.push(await this.sqlAgent.execute(context));
          break;
        case "MCP_TOOL":
          agentResults.push(await this.toolAgent.execute(context));
          break;
      }
    }

    return this.responseAgent.execute({ context, agentResults });
  }
}
