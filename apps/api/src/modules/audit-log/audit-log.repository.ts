import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AuditLogRecord } from "./audit-log.types.js";

const MAX_STORED_AUDIT_RECORDS = 20_000;
const auditLogPath = path.resolve(
  fileURLToPath(new URL("../../../data/audit-log.json", import.meta.url)),
);

type AuditLogFile = {
  records?: AuditLogRecord[];
};

let writeQueue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<AuditLogRecord[]> {
  try {
    const raw = await readFile(auditLogPath, "utf8");
    const parsed = JSON.parse(raw) as AuditLogFile;
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

async function writeRecords(records: AuditLogRecord[]): Promise<void> {
  await mkdir(path.dirname(auditLogPath), { recursive: true });
  await writeFile(
    auditLogPath,
    `${JSON.stringify({ records }, null, 2)}\n`,
    "utf8",
  );
}

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export const auditLogRepository = {
  async append(record: AuditLogRecord): Promise<AuditLogRecord> {
    return enqueueWrite(async () => {
      const records = await readRecords();
      const nextRecords = [record, ...records].slice(0, MAX_STORED_AUDIT_RECORDS);
      await writeRecords(nextRecords);
      return record;
    });
  },

  async listByTenant(tenantId: string): Promise<AuditLogRecord[]> {
    await writeQueue;
    return (await readRecords()).filter((record) => record.tenantId === tenantId);
  },
};
