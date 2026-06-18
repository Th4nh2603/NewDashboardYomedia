import type { AgentContext } from "../../runtime/agent-context.js";
import type { ChatIntent } from "../orchestrator/orchestrator.types.js";

export class IntentAgent {
  async detect(_context: AgentContext): Promise<{ intents: ChatIntent[] }> {
    return { intents: ["GENERAL_CHAT"] };
  }
}
