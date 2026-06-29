import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ApprovalRecord } from "./approval.types.js";

const MAX_STORED_APPROVALS = 10_000;
const approvalPath = path.resolve(
  fileURLToPath(new URL("../../../data/approvals.json", import.meta.url)),
);

type ApprovalFile = {
  records?: ApprovalRecord[];
};

let writeQueue: Promise<void> = Promise.resolve();

async function readRecords(): Promise<ApprovalRecord[]> {
  try {
    const raw = await readFile(approvalPath, "utf8");
    const parsed = JSON.parse(raw) as ApprovalFile;
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

async function writeRecords(records: ApprovalRecord[]): Promise<void> {
  await mkdir(path.dirname(approvalPath), { recursive: true });
  await writeFile(
    approvalPath,
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

export const approvalRepository = {
  async create(record: ApprovalRecord): Promise<ApprovalRecord> {
    return enqueueWrite(async () => {
      const records = await readRecords();
      const nextRecords = [record, ...records].slice(0, MAX_STORED_APPROVALS);
      await writeRecords(nextRecords);
      return record;
    });
  },

  async get(id: string): Promise<ApprovalRecord | undefined> {
    await writeQueue;
    return (await readRecords()).find((record) => record.id === id);
  },

  async listByTenant(tenantId: string): Promise<ApprovalRecord[]> {
    await writeQueue;
    return (await readRecords()).filter((record) => record.tenantId === tenantId);
  },

  async update(
    id: string,
    updater: (record: ApprovalRecord) => ApprovalRecord,
  ): Promise<ApprovalRecord> {
    return enqueueWrite(async () => {
      const records = await readRecords();
      const index = records.findIndex((record) => record.id === id);
      if (index < 0) throw new Error("Approval request was not found.");
      const updated = updater(records[index]!);
      const nextRecords = records.slice();
      nextRecords[index] = updated;
      await writeRecords(nextRecords);
      return updated;
    });
  },
};
