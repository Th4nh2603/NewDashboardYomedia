import type { AgentContext, AgentResult } from "../../core/types.js";
import { callProvider } from "../../services/llm/callProvider.js";
import {
  executeMysqlQuery,
  getMysqlWhitelist,
  isMysqlConfigured,
  sqlAllowedRoles,
} from "../../tools/mysql/index.js";
import { logBestEffort } from "../../../logBestEffort.js";

function parseSqlFromLlm(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json|sql)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || trimmed).trim();
  if (/^select\b/i.test(candidate)) return candidate;
  try {
    const parsed = JSON.parse(candidate) as { sql?: string };
    if (parsed?.sql && /^select\b/i.test(parsed.sql.trim())) {
      return parsed.sql.trim();
    }
  } catch {
    // not JSON
  }
  return null;
}

function formatColumnRules(whitelist: ReturnType<typeof getMysqlWhitelist>): string {
  const entries = Object.entries(whitelist.columnsByTable).filter(
    ([, cols]) => cols.length > 0,
  );
  if (!entries.length) {
    return "- Column whitelist: not configured (avoid SELECT * when possible)";
  }
  const lines = entries.map(
    ([table, cols]) => `  - ${table}: ${cols.join(", ")}`,
  );
  return [
    "- Only use whitelisted columns per table (SELECT * is rejected):",
    ...lines,
  ].join("\n");
}

async function generateSql(ctx: AgentContext): Promise<string | null> {
  const whitelist = getMysqlWhitelist();
  const prompt = [
    "Generate a MySQL SELECT query for the user question.",
    "Return STRICT JSON only: {\"sql\":\"SELECT ...\"}",
    "Rules:",
    "- SELECT only, no DDL/DML",
    `- Only use whitelisted tables: ${whitelist.tables.join(", ") || "(none)"}`,
    formatColumnRules(whitelist),
    `- Always include LIMIT <= ${whitelist.maxRows}`,
    "- Do not use subqueries that reference non-whitelisted tables",
    "",
    `User question: ${JSON.stringify(ctx.question)}`,
  ].join("\n");
  try {
    const raw = await callProvider(ctx.provider, prompt, []);
    return parseSqlFromLlm(raw);
  } catch (err) {
    logBestEffort("ai.sql.generate", err);
    return null;
  }
}

function formatRowsAsMarkdown(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "Không có dữ liệu trả về.";
  const keys = Object.keys(rows[0]);
  const header = `| ${keys.join(" | ")} |`;
  const sep = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows
    .slice(0, 20)
    .map((row) => `| ${keys.map((k) => String(row[k] ?? "")).join(" | ")} |`)
    .join("\n");
  return [header, sep, body].join("\n");
}

export async function runSqlAgent(ctx: AgentContext): Promise<AgentResult> {
  const startedAt = Date.now();
  const role = String(ctx.role || "").trim().toLowerCase();

  if (!sqlAllowedRoles().has(role)) {
    return {
      ok: false,
      agent: "sql",
      answer: "Bạn không có quyền truy vấn SQL. Liên hệ admin.",
      confidence: 0,
      sources: ["mysql"],
      spans: [
        {
          agent: "sql",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: "Forbidden role for SQL agent",
        },
      ],
    };
  }

  if (!isMysqlConfigured()) {
    return {
      ok: false,
      agent: "sql",
      answer:
        "SQL Agent chưa sẵn sàng. Cấu hình MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE, MYSQL_PASSWORD và MYSQL_ALLOWED_TABLES trên server.",
      confidence: 0,
      sources: ["mysql"],
      spans: [
        {
          agent: "sql",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: "MySQL not configured",
        },
      ],
    };
  }

  const sql = await generateSql(ctx);
  if (!sql) {
    return {
      ok: false,
      agent: "sql",
      answer:
        "Không tạo được câu SQL an toàn từ câu hỏi. Bạn thử mô tả rõ bảng/cột cần tra cứu.",
      confidence: 0,
      sources: ["mysql"],
      spans: [
        {
          agent: "sql",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: "SQL generation failed",
        },
      ],
    };
  }

  const result = await executeMysqlQuery(sql);
  if (!result.ok) {
    return {
      ok: false,
      agent: "sql",
      answer: `SQL thất bại: ${result.reason}`,
      confidence: 0,
      sources: ["mysql"],
      metadata: { sql },
      spans: [
        {
          agent: "sql",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: result.reason,
        },
      ],
    };
  }

  const table = formatRowsAsMarkdown(result.rows);
  const answer = [
    `Đã chạy SQL (${result.rowCount} dòng):`,
    "```sql",
    result.sql,
    "```",
    "",
    table,
  ].join("\n");

  return {
    ok: true,
    agent: "sql",
    answer,
    confidence: 0.85,
    sources: ["mysql"],
    metadata: { sql: result.sql, rowCount: result.rowCount },
    spans: [
      {
        agent: "sql",
        startedAt,
        endedAt: Date.now(),
        ok: true,
        confidence: 0.85,
        sources: ["mysql"],
      },
    ],
  };
}
