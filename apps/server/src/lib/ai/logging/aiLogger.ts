type AiLogLevel = "info" | "warn" | "error";

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

export function logAiEvent(
  event: string,
  payload: Record<string, unknown>,
  level: AiLogLevel = "info",
): void {
  const line = `[ai.${event}] ${safeJson(payload)}`;
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}
