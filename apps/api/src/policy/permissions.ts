import type { AgentContext } from "../ai/runtime/agent-context.js";

export function hasAllPermissions(
  context: AgentContext,
  requiredPermissions: readonly string[] | undefined,
): boolean {
  return (requiredPermissions ?? []).every((permission) =>
    context.permissions.includes(permission),
  );
}

export function isToolAllowed(context: AgentContext, toolName: string): boolean {
  // `allowedMcpTools` is legacy naming only. MCP is not enabled in Agent Core.
  const allowedTools = context.allowedToolCapabilities ?? context.allowedMcpTools;
  return (
    allowedTools.length === 0 ||
    allowedTools.includes("*") ||
    allowedTools.includes(toolName)
  );
}
