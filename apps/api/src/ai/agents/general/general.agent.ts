import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";

export class GeneralAgent {
  async execute(_context: AgentContext): Promise<AgentResult> {
    return { agent: "general", output: null };
  }
}
