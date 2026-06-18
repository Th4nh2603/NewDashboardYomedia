export function canUseTool(allowedTools: string[], toolName: string): boolean {
  return allowedTools.includes(toolName);
}
