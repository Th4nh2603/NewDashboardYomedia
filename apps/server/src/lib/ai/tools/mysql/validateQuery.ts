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

  const columnCheck = validateSelectColumns(trimmed, referenced, whitelist);
  if (!columnCheck.ok) {
    return columnCheck;
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

function validateSelectColumns(
  sql: string,
  referencedTables: string[],
  whitelist: MysqlWhitelist,
): { ok: true } | { ok: false; reason: string } {
  const restrictedTables = referencedTables
    .map((t) => t.toLowerCase())
    .filter((t) => (whitelist.columnsByTable[t]?.length ?? 0) > 0);

  if (!restrictedTables.length) {
    return { ok: true };
  }

  const selectMatch = sql.match(/\bselect\s+([\s\S]+?)\s+from\b/i);
  if (!selectMatch) {
    return { ok: false, reason: "Invalid SELECT query" };
  }

  const selectList = selectMatch[1].trim();
  const expressions = splitSelectList(selectList);
  for (const expr of expressions) {
    const core = expr.replace(/\s+as\s+\w+$/i, "").trim();
    if (/^\*$/.test(core) || /^`?\w+`?\.\*$/i.test(core)) {
      return {
        ok: false,
        reason:
          "SELECT * is not allowed when MYSQL_ALLOWED_COLUMNS is configured",
      };
    }
  }

  for (const expr of expressions) {
    const ref = extractColumnReference(expr);
    if (!ref) continue;

    if (ref.table) {
      const table = ref.table.toLowerCase();
      const allowedCols = whitelist.columnsByTable[table];
      if (!allowedCols?.length) continue;
      if (!allowedCols.includes(ref.column)) {
        return {
          ok: false,
          reason: `Column "${ref.column}" is not allowed on table "${table}"`,
        };
      }
      continue;
    }

    const allowedForBare = new Set<string>();
    for (const table of restrictedTables) {
      for (const col of whitelist.columnsByTable[table] ?? []) {
        allowedForBare.add(col);
      }
    }
    if (!allowedForBare.has(ref.column)) {
      return {
        ok: false,
        reason: `Column "${ref.column}" is not in MYSQL_ALLOWED_COLUMNS whitelist`,
      };
    }
  }

  return { ok: true };
}

function splitSelectList(selectList: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of selectList) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractColumnReference(
  expression: string,
): { table?: string; column: string } | null {
  const trimmed = expression.trim();
  if (/^count\s*\(\s*\*\s*\)$/i.test(trimmed)) {
    return null;
  }

  const funcMatch = trimmed.match(
    /^(?:count|sum|avg|min|max)\s*\(\s*(?:distinct\s+)?(?:(`?)(\w+)\1\s*\.\s*)?(`?)(\w+)\3\s*\)$/i,
  );
  if (funcMatch) {
    const table = funcMatch[2];
    const column = funcMatch[4];
    return table ? { table, column: column.toLowerCase() } : { column: column.toLowerCase() };
  }

  const asMatch = trimmed.match(/^(.+?)\s+as\s+\w+$/i);
  const core = (asMatch?.[1] ?? trimmed).trim();
  const qualified = core.match(/^(?:`?(\w+)`?\.)?`?(\w+)`?$/);
  if (!qualified) return null;

  const table = qualified[1];
  const column = qualified[2].toLowerCase();
  return table ? { table: table.toLowerCase(), column } : { column };
}
