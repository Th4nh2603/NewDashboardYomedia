export function isToolAllowed(allowedTools: string[] | undefined, toolName: string): boolean {
  return !allowedTools || allowedTools.includes(toolName);
}
