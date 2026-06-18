import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";

export class RagAgent {
  async execute(_context: AgentContext): Promise<AgentResult> {
    return { agent: "rag", output: null };
  }
}
