import type { AgentTool } from "../../ai/tools/tool.interface.js";
import type { McpClientManager } from "../client/mcp-client.manager.js";
import type { McpToolDefinition } from "../mcp.types.js";

export function convertMcpToolToAgentTool(
  serverName: string,
  mcpTool: McpToolDefinition,
  manager: McpClientManager,
): AgentTool {
  return {
    name: `${serverName}.${mcpTool.name}`,
    description: mcpTool.description ?? "",
    inputSchema: mcpTool.inputSchema,
    execute: async (input, context) => {
      await context.permissionService.assertToolPermission({
        userId: context.userId,
        serverName,
        toolName: mcpTool.name,
      });

      return manager.callTool(serverName, mcpTool.name, input);
    },
  };
}
