import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";

export class SqlAgent {
  async execute(_context: AgentContext): Promise<AgentResult> {
    return { agent: "sql", output: null };
  }
}
