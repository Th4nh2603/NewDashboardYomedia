const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|credential|privateKey|apiKey|authorization)/i;

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (typeof value !== "object" || value === null) {
    if (typeof value === "string" && value.length > 500) {
      return `${value.slice(0, 497)}...`;
    }
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[redacted]"
      : sanitizeForLog(entry);
  }
  return sanitized;
}

export function summarizeForApproval(input: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      summary[key] = "[redacted]";
    } else if (typeof value === "string") {
      summary[key] = value.length > 180 ? `${value.slice(0, 177)}...` : value;
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      summary[key] = value;
    } else if (Array.isArray(value)) {
      summary[key] = `[${value.length} item(s)]`;
    } else if (value !== undefined) {
      summary[key] = "[object]";
    }
  }
  return summary;
}
