export function assertToolAllowed(allowedTools: string[], toolName: string): void {
  if (!allowedTools.includes(toolName)) {
    throw new Error(`Tool "${toolName}" is not allowed.`);
  }
}
