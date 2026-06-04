/**
 * Log optional / fallback paths without failing the main request.
 */
export function logBestEffort(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[${context}]`, message, extra ?? "");
}
