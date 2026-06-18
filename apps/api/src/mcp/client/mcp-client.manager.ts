import type { McpServerConfig } from "../mcp.types.js";
import { McpClientFactory, type McpClient } from "./mcp-client.factory.js";

export class McpClientManager {
  private readonly clients = new Map<string, McpClient>();

  async connect(config: McpServerConfig): Promise<void> {
    const client = await McpClientFactory.create(config);
    await client.connect();
    this.clients.set(config.name, client);
  }

  async listTools(serverName: string) {
    return this.getClient(serverName).listTools();
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>) {
    return this.getClient(serverName).callTool({
      name: toolName,
      arguments: args,
    });
  }

  private getClient(serverName: string): McpClient {
    const client = this.clients.get(serverName);

    if (!client) {
      throw new Error(`MCP server "${serverName}" is not connected`);
    }

    return client;
  }
}
