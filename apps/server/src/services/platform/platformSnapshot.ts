import { readFile, writeFile } from "node:fs/promises";
import type { PlatformTestSnapshot } from "./yomediaPlatform.js";
import { platformSnapshotPath } from "../infra/paths.js";

export type StoredPlatformSnapshot = PlatformTestSnapshot & {
  savedAt: string;
  source: string;
};

export async function readStoredPlatformSnapshot(): Promise<StoredPlatformSnapshot | null> {
  const raw = await readFile(platformSnapshotPath, "utf8").catch(
    (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return null;
      throw err;
    },
  );
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  try {
    return JSON.parse(trimmed) as StoredPlatformSnapshot;
  } catch {
    throw new Error("platform-snapshot.json is not valid JSON");
  }
}

export async function writePlatformSnapshot(
  snapshot: PlatformTestSnapshot,
): Promise<StoredPlatformSnapshot> {
  const stored: StoredPlatformSnapshot = {
    ...snapshot,
    savedAt: new Date().toISOString(),
    source: snapshot.banner.url.replace(/\/banner$/, ""),
  };
  const text = `${JSON.stringify(stored, null, 2)}\n`;
  await writeFile(platformSnapshotPath, text, "utf8");
  return stored;
}

export { platformSnapshotPath };
