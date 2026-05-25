import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { HttpError } from "../lib/http/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ACTIVITY_LOG_JSON_PATH = path.join(
  __dirname,
  "..",
  "data",
  "activity-log.json",
);
const MAX_ACTIVITY_RECORDS = 1000;

export type ActivityLogEntry = {
  id: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  area: string;
  description: string;
  target: string;
  metadata?: Record<string, unknown>;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeTextLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeMetadata(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function recordMatchesManageDemoSftpScope(
  record: ActivityLogEntry,
  scope: "demo" | "media",
): boolean {
  const meta = record.metadata;
  const raw =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? normalizeTextLower((meta as Record<string, unknown>).scope)
      : "";
  if (scope === "media") return raw === "media";
  return raw === "demo" || raw === "";
}

function isDemoSftpTreeTarget(target: unknown): boolean {
  const t = normalizeText(target).replace(/\\/g, "/");
  if (!t) return false;
  const lower = t.toLowerCase();
  return (
    lower.startsWith("/script/demo/") ||
    lower === "/script/demo" ||
    lower.startsWith("script/demo/")
  );
}

function isDemoSftpUploadAuditRecord(record: ActivityLogEntry): boolean {
  const action = normalizeTextLower(record.action);
  const area = normalizeText(record.area);

  if (action === "upload_files" && area === "Manage Demo") return true;

  if (
    area === "Build Demo" &&
    (action === "upload_demo_success" || action === "upload_demo_partial") &&
    isDemoSftpTreeTarget(record.target)
  ) {
    return true;
  }

  return false;
}

type ActivityLogFileParsed = {
  records: ActivityLogEntry[];
  skipPageViewPaths: string[];
};

async function readActivityLogFile(): Promise<ActivityLogFileParsed> {
  try {
    const raw = await readFile(ACTIVITY_LOG_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      records?: unknown;
      skipPageViewPaths?: unknown;
    };
    const records = Array.isArray(parsed.records)
      ? (parsed.records as ActivityLogEntry[])
      : [];
    const skipPageViewPaths = Array.isArray(parsed.skipPageViewPaths)
      ? parsed.skipPageViewPaths
          .filter((p): p is string => typeof p === "string")
          .map((p) => normalizeText(p))
          .filter(Boolean)
      : [];
    return { records, skipPageViewPaths };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code === "ENOENT") return { records: [], skipPageViewPaths: [] };
    throw error;
  }
}

async function readActivityLogEntries(): Promise<ActivityLogEntry[]> {
  const { records } = await readActivityLogFile();
  return records;
}

async function writeActivityLogEntries(records: ActivityLogEntry[]) {
  await mkdir(path.dirname(ACTIVITY_LOG_JSON_PATH), { recursive: true });
  const { skipPageViewPaths } = await readActivityLogFile();
  await writeFile(
    ACTIVITY_LOG_JSON_PATH,
    JSON.stringify({ skipPageViewPaths, records }, null, 2) + "\n",
    "utf8",
  );
}

export async function listActivityLogs(input: {
  role: string;
  email?: string;
  special?: string;
  scope?: string;
  limit?: number;
}) {
  const email = normalizeTextLower(input.email);
  const special = normalizeTextLower(input.special);
  const limitRaw = Number(input.limit ?? 100);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(500, Math.trunc(limitRaw)))
    : 100;

  const records = await readActivityLogEntries();
  let filtered: ActivityLogEntry[];

  if (special === "manage-demo-uploads") {
    if (input.role !== "admin") {
      throw new HttpError(403, "Admin only", { code: "FORBIDDEN" });
    }
    filtered = records.filter((record) => isDemoSftpUploadAuditRecord(record));
    const scopeRaw = normalizeTextLower(input.scope);
    if (scopeRaw === "demo" || scopeRaw === "media") {
      filtered = filtered.filter((record) =>
        recordMatchesManageDemoSftpScope(record, scopeRaw),
      );
    }
  } else if (special === "manager-team") {
    if (input.role !== "manager") {
      throw new HttpError(403, "Manager only", { code: "FORBIDDEN" });
    }
    filtered = records.filter((record) => {
      const ur = normalizeTextLower(record.userRole);
      return ur === "media" || ur === "design";
    });
  } else if (email) {
    filtered = records.filter(
      (record) => normalizeTextLower(record.userEmail) === email,
    );
    if (input.role === "manager") {
      filtered = filtered.filter((record) => {
        const ur = normalizeTextLower(record.userRole);
        return ur === "media" || ur === "design";
      });
    }
  } else {
    filtered = input.role === "admin" ? records : [];
  }

  return {
    ok: true as const,
    records: filtered.slice(0, limit),
    total: filtered.length,
  };
}

export async function appendActivityLog(body: {
  userName?: unknown;
  userEmail?: unknown;
  userRole?: unknown;
  action?: unknown;
  area?: unknown;
  description?: unknown;
  target?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
}) {
  const userName = normalizeText(body?.userName);
  const userEmail = normalizeText(body?.userEmail);
  const userRole = normalizeText(body?.userRole);
  const action = normalizeText(body?.action);
  const area = normalizeText(body?.area);
  const description = normalizeText(body?.description);
  const target = normalizeText(body?.target);
  const createdAt = normalizeText(body?.createdAt) || new Date().toISOString();

  if (!userName && !userEmail) {
    throw new HttpError(400, "Missing user identity", { code: "BAD_REQUEST" });
  }
  if (!action) {
    throw new HttpError(400, "Missing activity action", { code: "BAD_REQUEST" });
  }
  if (!area) {
    throw new HttpError(400, "Missing activity area", { code: "BAD_REQUEST" });
  }
  if (!description) {
    throw new HttpError(400, "Missing activity description", {
      code: "BAD_REQUEST",
    });
  }

  const metadata = normalizeMetadata(body?.metadata);

  if (normalizeTextLower(action) === "page_view") {
    return { ok: true as const, skipped: true as const };
  }

  const { records } = await readActivityLogFile();

  const record: ActivityLogEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    userName,
    userEmail,
    userRole,
    action,
    area,
    description,
    target,
    metadata,
  };

  records.unshift(record);
  await writeActivityLogEntries(records.slice(0, MAX_ACTIVITY_RECORDS));

  return { ok: true as const, record };
}

export async function clearActivityLogs(role: string) {
  if (role !== "admin") {
    throw new HttpError(403, "Admin only", { code: "FORBIDDEN" });
  }
  await writeActivityLogEntries([]);
  return { ok: true as const };
}
