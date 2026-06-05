import mysql from "mysql2/promise";
import { logBestEffort } from "../../../logBestEffort.js";
import { serviceUnavailable } from "../../../http/errors.js";
import { getMysqlWhitelist, isMysqlConfigured } from "./whitelist.js";
import { validateSelectQuery } from "./validateQuery.js";

export type MysqlQueryResult = {
  ok: true;
  rows: Record<string, unknown>[];
  rowCount: number;
  sql: string;
};

export type MysqlQueryError = {
  ok: false;
  reason: string;
};

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;
  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  if (!host || !user || !database) {
    throw serviceUnavailable("MySQL is not configured");
  }
  pool = mysql.createPool({
    host,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user,
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10_000,
  });
  return pool;
}

export async function executeMysqlQuery(
  sql: string,
): Promise<MysqlQueryResult | MysqlQueryError> {
  if (!isMysqlConfigured()) {
    return {
      ok: false,
      reason:
        "MySQL chưa cấu hình. Cần MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE và MYSQL_ALLOWED_TABLES.",
    };
  }

  const whitelist = getMysqlWhitelist();
  const validated = validateSelectQuery(sql, whitelist);
  if (!validated.ok) {
    return { ok: false, reason: validated.reason };
  }

  try {
    const connection = getPool();
    const [rows] = await connection.query(validated.sql);
    const list = Array.isArray(rows)
      ? (rows as Record<string, unknown>[])
      : [];
    return {
      ok: true,
      rows: list,
      rowCount: list.length,
      sql: validated.sql,
    };
  } catch (err) {
    logBestEffort("ai.mysql.query", err);
    const message = err instanceof Error ? err.message : "MySQL query failed";
    return { ok: false, reason: message };
  }
}
