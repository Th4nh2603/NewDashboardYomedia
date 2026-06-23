import type { ToolExecutionContext } from "../../mcp/mcp.types.js";
import type { AgentContext } from "../runtime/agent-context.js";

export type AgentToolExecutionContext = ToolExecutionContext &
  Partial<
    Pick<
      AgentContext,
      | "tenantId"
      | "allowedBrandIds"
      | "allowedKnowledgeBaseIds"
      | "requestedBrandId"
      | "requestedKnowledgeBaseId"
    >
  >;

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: unknown;
  execute(
    input: Record<string, unknown>,
    context: AgentToolExecutionContext,
  ): Promise<unknown>;
}
