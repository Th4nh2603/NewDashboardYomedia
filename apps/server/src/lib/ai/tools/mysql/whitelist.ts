export type MysqlWhitelist = {
  tables: string[];
  /** Per-table allowed columns; empty / missing entry means all columns allowed. */
  columnsByTable: Record<string, string[]>;
  maxRows: number;
};

const DEFAULT_MAX_ROWS = 100;

/**
 * MYSQL_ALLOWED_COLUMNS format:
 *   campaigns:id,name,status;banners:id,name,created_at
 */
function parseColumnWhitelist(): Record<string, string[]> {
  const raw = process.env.MYSQL_ALLOWED_COLUMNS?.trim();
  if (!raw) return {};

  const result: Record<string, string[]> = {};
  for (const segment of raw.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const table = trimmed.slice(0, colon).trim().toLowerCase();
    const columns = trimmed
      .slice(colon + 1)
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    if (table && columns.length) {
      result[table] = columns;
    }
  }
  return result;
}

export function getMysqlWhitelist(): MysqlWhitelist {
  const raw = process.env.MYSQL_ALLOWED_TABLES?.trim();
  const tables = raw
    ? raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];
  const maxRowsRaw = Number(process.env.MYSQL_MAX_ROWS ?? DEFAULT_MAX_ROWS);
  const maxRows =
    Number.isFinite(maxRowsRaw) && maxRowsRaw > 0
      ? Math.min(500, Math.trunc(maxRowsRaw))
      : DEFAULT_MAX_ROWS;
  return {
    tables,
    columnsByTable: parseColumnWhitelist(),
    maxRows,
  };
}

export function isMysqlConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_HOST?.trim() &&
      process.env.MYSQL_USER?.trim() &&
      process.env.MYSQL_DATABASE?.trim() &&
      getMysqlWhitelist().tables.length > 0,
  );
}

export { sqlAllowedRoles } from "../../core/agentAccess.js";
