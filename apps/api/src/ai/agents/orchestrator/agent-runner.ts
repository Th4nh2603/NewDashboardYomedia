import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "./orchestrator.types.js";

export interface RunnableAgent {
  execute(context: AgentContext): Promise<AgentResult>;
}

export function runAgent(agent: RunnableAgent, context: AgentContext) {
  return agent.execute(context);
}
