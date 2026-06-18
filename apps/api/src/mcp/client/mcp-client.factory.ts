import type { McpServerConfig, McpToolDefinition } from "../mcp.types.js";

export interface McpClient {
  connect(): Promise<void>;
  listTools(): Promise<McpToolDefinition[]>;
  callTool(input: { name: string; arguments: Record<string, unknown> }): Promise<unknown>;
}

export class McpClientFactory {
  static async create(_config: McpServerConfig): Promise<McpClient> {
    return {
      async connect() {},
      async listTools() {
        return [];
      },
      async callTool() {
        throw new Error("MCP client callTool is not implemented yet.");
      },
    };
  }
}
