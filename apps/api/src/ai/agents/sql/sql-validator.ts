const DESTRUCTIVE_SQL_PATTERN =
  /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|merge|call|execute)\b/i;

export function assertReadOnlySql(sql: string): void {
  if (!/^\s*select\b/i.test(sql)) {
    throw new Error("Only read-only SELECT queries are allowed.");
  }
  if (DESTRUCTIVE_SQL_PATTERN.test(sql)) {
    throw new Error("Destructive SQL is not allowed.");
  }
}

export function ensureSqlRowLimit(sql: string, rowLimit = 500): string {
  if (/\blimit\s+\d+\b/i.test(sql)) return sql;
  return `${sql.replace(/;\s*$/, "")} LIMIT ${rowLimit}`;
}

export function assertAllowedSqlTables(
  sql: string,
  allowedTables: readonly string[],
): void {
  if (allowedTables.length === 0) return;
  const lower = sql.toLowerCase();
  const usesAllowedTable = allowedTables.some((table) =>
    lower.includes(table.toLowerCase()),
  );
  if (!usesAllowedTable) {
    throw new Error("SQL query does not target an allowlisted table or view.");
  }
}
