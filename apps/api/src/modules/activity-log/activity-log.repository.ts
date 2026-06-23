import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ActivityLogEntry } from "./activity-log.types.js";

const MAX_STORED_ENTRIES = 5_000;
const activityLogPath = path.resolve(
  fileURLToPath(new URL("../../../data/activity-log.json", import.meta.url)),
);

type ActivityLogFile = {
  records?: ActivityLogEntry[];
};

let writeQueue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<ActivityLogEntry[]> {
  try {
    const raw = await readFile(activityLogPath, "utf8");
    const parsed = JSON.parse(raw) as ActivityLogFile;
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

async function writeRecords(records: ActivityLogEntry[]): Promise<void> {
  await mkdir(path.dirname(activityLogPath), { recursive: true });
  await writeFile(
    activityLogPath,
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

export const activityLogRepository = {
  async append(entry: ActivityLogEntry): Promise<ActivityLogEntry> {
    return enqueueWrite(async () => {
      const records = await readRecords();
      const nextRecords = [entry, ...records].slice(0, MAX_STORED_ENTRIES);
      await writeRecords(nextRecords);
      return entry;
    });
  },

  async list(): Promise<ActivityLogEntry[]> {
    await writeQueue;
    return readRecords();
  },

  async clearTenant(tenantId: string): Promise<number> {
    return enqueueWrite(async () => {
      const records = await readRecords();
      const remaining = records.filter((record) => record.tenantId !== tenantId);
      await writeRecords(remaining);
      return records.length - remaining.length;
    });
  },
};
