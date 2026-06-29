import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";
import type {
  OrchestratorPlanningAgent,
} from "../orchestrator/orchestrator.js";
import type { ToolAgent } from "./tool.agent.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asToolAction(result: AgentResult): { tool: string; [key: string]: unknown } | null {
  const output = asRecord(result.output);
  const action = asRecord(output?.action);
  const tool = typeof action?.tool === "string" ? action.tool : null;
  return tool ? { ...action, tool } : null;
}

function extractRemotePath(message: string): string | null {
  const direct = message.match(
    /(?:path|folder|remote|dir|directory)\s*[:=]\s*([^,;\n]+)/i,
  )?.[1];
  if (direct?.trim()) return direct.trim();

  const pathLike = message.match(
    /(?:\/script\/demo\/|script\/demo\/)?\d{4}\/\d{1,2}\/[^\s,;]+/i,
  )?.[0];
  return pathLike?.trim() ?? null;
}

function normalizeMessage(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function looksLikePreviewRequest(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes("preview link") ||
    normalized.includes("demo link") ||
    normalized.includes("build preview") ||
    normalized.includes("link demo")
  );
}

function looksLikeSftpExistsRequest(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes("sftp") &&
    (normalized.includes("exists") ||
      normalized.includes("ton tai") ||
      normalized.includes("check"))
  );
}

function looksLikeSftpListRequest(message: string): boolean {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes("sftp") &&
    (normalized.includes("list") ||
      normalized.includes("listing") ||
      normalized.includes("show") ||
      normalized.includes("display") ||
      normalized.includes("danh sach") ||
      normalized.includes("hien thi") ||
      normalized.includes("liet ke"))
  );
}

function normalizeSftpListPath(path: string): string {
  const normalized = path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/");
  if (normalized.startsWith("/script/demo/")) return normalized;
  if (normalized.startsWith("script/demo/")) return `/${normalized}`;
  return `/script/demo/${normalized.replace(/^\/+/, "")}`.replace(
    /\/{2,}/g,
    "/",
  );
}

function extractSftpListPath(message: string): string | null {
  const explicit = message.match(
    /(?:\/script\/demo\/|script\/demo\/)?\d{4}\/\d{1,2}(?:\/[^\s,;]+)?/i,
  )?.[0];
  if (explicit?.trim()) return normalizeSftpListPath(explicit);

  const normalized = normalizeMessage(message);
  const monthYear =
    normalized.match(
      /(?:thang|month)\s*(\d{1,2})\D+(?:nam|year)?\s*(20\d{2})/,
    ) ??
    normalized.match(/(20\d{2})\D+(?:thang|month)\s*(\d{1,2})/);
  if (!monthYear) return null;

  const first = Number(monthYear[1]);
  const second = Number(monthYear[2]);
  const year = first > 999 ? first : second;
  const month = first > 999 ? second : first;
  if (month < 1 || month > 12 || year < 2000) return null;

  return `/script/demo/${year}/${String(month).padStart(2, "0")}`;
}

export class ToolAgentPlanner implements OrchestratorPlanningAgent {
  readonly name = "tool-agent-planner";

  constructor(private readonly toolAgent: ToolAgent) {}

  async plan(input: {
    userQuery: string;
    context: AgentContext;
  }): Promise<{
    answer?: string;
    toolCall?: { name: string; input: Record<string, unknown> };
    action?: { tool: string; [key: string]: unknown };
  }> {
    const remotePath = extractRemotePath(input.userQuery);
    const sftpListPath = extractSftpListPath(input.userQuery);
    if (sftpListPath && looksLikeSftpListRequest(input.userQuery)) {
      return {
        toolCall: {
          name: "sftp.list",
          input: { path: sftpListPath, scope: "demo" },
        },
      };
    }

    if (remotePath && looksLikeSftpExistsRequest(input.userQuery)) {
      return {
        toolCall: {
          name: "sftp_exists_check",
          input: { remotePath },
        },
      };
    }

    if (remotePath && looksLikePreviewRequest(input.userQuery)) {
      return {
        toolCall: {
          name: "build_preview_link",
          input: { remotePath },
        },
      };
    }

    const result = await this.toolAgent.execute(input.context);
    const action = asToolAction(result);
    if (action) {
      const { tool, ...toolInput } = action;
      return {
        toolCall: {
          name: tool,
          input: toolInput,
        },
        action,
      };
    }

    const output = asRecord(result.output);
    return {
      answer:
        typeof output?.answer === "string"
          ? output.answer
          : "No backend tool workflow matched this request.",
    };
  }
}
