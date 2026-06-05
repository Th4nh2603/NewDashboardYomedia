import type { MysqlWhitelist } from "./whitelist.js";

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|call|exec|execute|into\s+outfile|load_file|sleep|benchmark)\b/i;

export function validateSelectQuery(
  sql: string,
  whitelist: MysqlWhitelist,
): { ok: true; sql: string } | { ok: false; reason: string } {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!trimmed) {
    return { ok: false, reason: "SQL query is empty" };
  }
  if (!/^select\b/i.test(trimmed)) {
    return { ok: false, reason: "Only SELECT queries are allowed" };
  }
  if (FORBIDDEN.test(trimmed)) {
    return { ok: false, reason: "Query contains forbidden keywords" };
  }
  if (trimmed.includes(";")) {
    return { ok: false, reason: "Multiple statements are not allowed" };
  }

  const referenced = extractTableNames(trimmed);
  if (!referenced.length) {
    return { ok: false, reason: "Could not detect table name in query" };
  }

  const allowed = new Set(whitelist.tables.map((t) => t.toLowerCase()));
  for (const table of referenced) {
    if (!allowed.has(table.toLowerCase())) {
      return {
        ok: false,
        reason: `Table "${table}" is not in MYSQL_ALLOWED_TABLES whitelist`,
      };
    }
  }

  const limited = enforceLimit(trimmed, whitelist.maxRows);
  return { ok: true, sql: limited };
}

function extractTableNames(sql: string): string[] {
  const normalized = sql.replace(/\s+/g, " ");
  const matches = [
    ...normalized.matchAll(/\bfrom\s+`?([a-zA-Z0-9_]+)`?/gi),
    ...normalized.matchAll(/\bjoin\s+`?([a-zA-Z0-9_]+)`?/gi),
  ];
  return [...new Set(matches.map((m) => m[1]).filter(Boolean))];
}

function enforceLimit(sql: string, maxRows: number): string {
  if (/\blimit\s+\d+/i.test(sql)) return sql;
  return `${sql} LIMIT ${maxRows}`;
}
