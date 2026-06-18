export interface McpServerConfig {
  name: string;
  enabled: boolean;
  transport:
    | {
        type: "stdio";
        command: string;
        args: string[];
        env?: Record<string, string>;
      }
    | {
        type: "http";
        url: string;
        headers?: Record<string, string>;
      };
  allowedTools?: string[];
  deniedTools?: string[];
  timeoutMs?: number;
}

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: unknown;
}

export interface ToolExecutionContext {
  userId: string;
  permissionService: {
    assertToolPermission(input: {
      userId: string;
      serverName: string;
      toolName: string;
    }): Promise<void>;
  };
}
