import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult, ChatAgentResult } from "../orchestrator/orchestrator.types.js";

export class ResponseAgent {
  async execute(_input: {
    context: AgentContext;
    agentResults: AgentResult[];
  }): Promise<ChatAgentResult> {
    return {
      answer: "Response agent is not implemented yet.",
      sources: [],
      toolCalls: [],
      steps: [],
    };
  }
}
