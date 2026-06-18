import type { createSftpClient } from "../sftpClient";

export type SftpClient = ReturnType<typeof createSftpClient>;

const DEMO_REMOTE_PREFIX = "/script/demo";
const MAX_PATH_TRIES = 500;

export function isSftpExistingEntry(data?: {
  ok?: boolean;
  exists?: boolean;
  kind?: string;
}): boolean {
  return Boolean(
    data?.ok &&
      data?.exists &&
      (data?.kind === "directory" ||
        data?.kind === "file" ||
        data?.kind === "symlink"),
  );
}

/** Relative path under `/script/demo/` with a free final segment (`seg`, `seg-1`, …). */
export async function resolveAvailableRemotePath(
  sftpClient: SftpClient,
  prefixSegments: string[],
  baseSeg: string,
): Promise<string> {
  for (let i = 0; i < MAX_PATH_TRIES; i++) {
    const seg = i === 0 ? baseSeg : `${baseSeg}-${i}`;
    const candidate = [...prefixSegments, seg].filter(Boolean).join("/");
    const existsData = await sftpClient.exists(
      `${DEMO_REMOTE_PREFIX}/${candidate}`,
      "demo",
    );
    if (!isSftpExistingEntry(existsData)) {
      return candidate;
    }
  }
  return [...prefixSegments, baseSeg].filter(Boolean).join("/");
}

/** Same collision logic as {@link resolveAvailableRemotePath}, returns only the free segment. */
export async function resolveFreeRemoteSegment(
  sftpClient: SftpClient,
  prefixSegments: string[],
  baseSeg: string,
): Promise<{ segment: string; exhausted: boolean }> {
  let counter = 0;
  let seg = baseSeg;

  while (counter < MAX_PATH_TRIES) {
    const rel = [...prefixSegments, seg].filter(Boolean).join("/");
    const data = await sftpClient.exists(`${DEMO_REMOTE_PREFIX}/${rel}`, "demo");
    if (!isSftpExistingEntry(data)) {
      return { segment: seg, exhausted: false };
    }
    counter += 1;
    seg = `${baseSeg}-${counter}`;
  }

  return { segment: baseSeg, exhausted: true };
}

/** Drop a leading folder that duplicates the SFTP leaf or upload basename. */
export function stripRedundantRelativeFolderPrefix(
  relativePath: string,
  opts: { remoteLeaf: string; uploadBaseToken: string },
): string {
  const normalized = relativePath.replace(/\\+/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return normalized;
  const first = parts[0] ?? "";
  const leaf = opts.remoteLeaf.trim();
  const base = opts.uploadBaseToken.trim();
  if ((leaf && first === leaf) || (base && first === base)) {
    return parts.slice(1).join("/");
  }
  return normalized;
}

export function demoRemoteBase(relativePath: string): string {
  return `${DEMO_REMOTE_PREFIX}/${relativePath}`
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
}
