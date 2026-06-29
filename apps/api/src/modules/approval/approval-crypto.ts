import { createHash } from "node:crypto";

const SENSITIVE_ARG_PATTERN =
  /(password|token|secret|credential|privateKey|apiKey|authorization|content|body|file|buffer|binary)/i;

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortCanonical(item));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, sortCanonical(entry)]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortCanonical(value));
}

export function hashApprovalArgs(value: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function persistableApprovalArgs(
  input: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_ARG_PATTERN.test(key)) return undefined;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      output[key] = value;
      continue;
    }
    return undefined;
  }
  return output;
}
