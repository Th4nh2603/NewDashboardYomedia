import type { ToolExecutionContext } from "../../mcp/mcp.types.js";

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: unknown;
  execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<unknown>;
}
