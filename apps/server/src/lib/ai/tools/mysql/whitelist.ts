export type MysqlWhitelist = {
  tables: string[];
  maxRows: number;
};

const DEFAULT_MAX_ROWS = 100;

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
  return { tables, maxRows };
}

export function isMysqlConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_HOST?.trim() &&
      process.env.MYSQL_USER?.trim() &&
      process.env.MYSQL_DATABASE?.trim() &&
      getMysqlWhitelist().tables.length > 0,
  );
}

export function sqlAllowedRoles(): Set<string> {
  const raw =
    process.env.AI_SQL_ALLOWED_ROLES?.trim() || "admin,manager";
  return new Set(
    raw
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean),
  );
}
