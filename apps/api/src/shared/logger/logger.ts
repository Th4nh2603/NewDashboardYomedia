const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|credential|private[-_]?prompt|prompt)/i;
const SENSITIVE_VALUE_PATTERNS: Array<[RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [Redacted]"],
  [/\b(sk|pk)_[A-Za-z0-9_-]{12,}\b/g, "[Redacted key]"],
];
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 25;
const MAX_DEPTH = 4;

type LogMeta = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

function truncate(value: string): string {
  const redacted = SENSITIVE_VALUE_PATTERNS.reduce(
    (next, [pattern, replacement]) => next.replace(pattern, replacement),
    value,
  );
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH - 3)}...`
    : redacted;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
    };
  }
  if (depth >= MAX_DEPTH) return "[Redacted: depth limit]";
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: LogMeta = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[Redacted]"
        : sanitizeValue(nestedValue, depth + 1);
    }
    return output;
  }
  return String(value);
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  if (meta) {
    console[level](message, sanitizeValue(meta));
    return;
  }
  console[level](message);
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    write("debug", message, meta);
  },
  info(message: string, meta?: LogMeta): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    write("warn", message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    write("error", message, meta);
  },
};
