export function assertReadOnlySql(sql: string): void {
  if (!/^\s*select\b/i.test(sql)) {
    throw new Error("Only read-only SELECT queries are allowed.");
  }
}
