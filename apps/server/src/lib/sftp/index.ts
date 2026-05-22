import SftpClient from "ssh2-sftp-client";
import JSZip from "jszip";

export interface SftpConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

/** Demo host (SFTP_*) vs second media/CDN host (SFTP_*_MEDIA). */
export type ManageSftpScope = "demo" | "media";

/**
 * Media host: logical paths stay `/script/demo/...` in the UI; on SFTP they map to
 * `{MEDIA_ROOT}/...` by **replacing** `/script/demo` (not `media/script/demo/...`).
 * `SFTP_MEDIA_MANAGE_PATH_PREFIX` sets `MEDIA_ROOT` (default `media`); empty disables
 * replacement and passes the path through normalized.
 */
export function mapRemotePathForManageScope(
  rawPath: string,
  scope: ManageSftpScope,
): string {
  const normalize = (s: string) =>
    (s || "").trim().replace(/\\+/g, "/").replace(/\/{2,}/g, "/");

  if (scope === "demo") {
    return normalize(rawPath);
  }

  const prefixRaw = process.env.SFTP_MEDIA_MANAGE_PATH_PREFIX;
  const MEDIA_ROOT =
    prefixRaw === undefined
      ? "media"
      : String(prefixRaw).trim().replace(/^\/+|\/+$/g, "");

  if (!MEDIA_ROOT) {
    return normalize(rawPath);
  }

  let p = normalize(rawPath);
  const trimmedSlash = p.replace(/\/+$/, "");
  const isScriptDemoOnly =
    /^\/script\/demo$/i.test(trimmedSlash) ||
    trimmedSlash.toLowerCase() === "script/demo";

  if (p === "" || p === "/" || isScriptDemoOnly) {
    return MEDIA_ROOT;
  }

  const afterScriptDemoSlash = /^\/script\/demo\/(.+)$/is.exec(p);
  if (afterScriptDemoSlash) {
    const rest = afterScriptDemoSlash[1].replace(/\/+$/, "");
    return `${MEDIA_ROOT}/${rest}`.replace(/\/{2,}/g, "/");
  }

  const afterScriptDemoRel = /^script\/demo\/(.+)$/is.exec(p);
  if (afterScriptDemoRel) {
    const rest = afterScriptDemoRel[1].replace(/\/+$/, "");
    return `${MEDIA_ROOT}/${rest}`.replace(/\/{2,}/g, "/");
  }

  if (p === MEDIA_ROOT || p.startsWith(`${MEDIA_ROOT}/`)) {
    return p.replace(/\/{2,}/g, "/");
  }

  if (p.startsWith("/")) {
    return `${MEDIA_ROOT}${p}`.replace(/\/{2,}/g, "/");
  }

  return `${MEDIA_ROOT}/${p}`.replace(/\/{2,}/g, "/");
}

/** Empty ⇒ existing demo defaults per operation; `media` ⇒ env SFTP_*_MEDIA only. */
export function configForManageSftpScope(scope: ManageSftpScope): SftpConfig {
  if (scope === "demo") return {};
  const host = process.env.SFTP_HOST_MEDIA;
  const portRaw = process.env.SFTP_PORT_MEDIA;
  const username = process.env.SFTP_USER_MEDIA;
  const password = process.env.SFTP_PASSWORD_MEDIA;
  if (!host || !username || !password) {
    throw new Error(
      "Missing SFTP MEDIA credentials. Set SFTP_HOST_MEDIA, SFTP_PORT_MEDIA, SFTP_USER_MEDIA, SFTP_PASSWORD_MEDIA in server .env.",
    );
  }
  let port = 2122;
  if (portRaw !== undefined && String(portRaw).trim() !== "") {
    const n = Number(portRaw);
    if (!Number.isFinite(n)) {
      throw new Error("SFTP_PORT_MEDIA must be a number.");
    }
    port = n;
  }
  return { host, port, username, password };
}

export async function testSftpConnection(config: SftpConfig) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const cwd = await client.cwd().catch(() => null);

    return {
      ok: true as const,
      host,
      port,
      cwd,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function listSftpDirectory(path: string, config: SftpConfig = {}) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const normalizedPath = (path || "/").replace(/\/{2,}/g, "/") || "/";

    let entries: {
      name: string;
      type: string;
      size: number;
      modifyTime?: number;
    }[];
    try {
      entries = (await client.list(normalizedPath)) as typeof entries;
    } catch (listErr: unknown) {
      const msg =
        listErr instanceof Error ? listErr.message : String(listErr);
      const code =
        typeof listErr === "object" &&
        listErr !== null &&
        "code" in listErr
          ? (listErr as { code?: number }).code
          : undefined;
      if (
        code === 2 ||
        /no such file|not found|does not exist/i.test(msg)
      ) {
        return [];
      }
      throw listErr;
    }

    const normalized = entries
      .filter(
        (entry) =>
          !entry.name.startsWith(".") && !entry.name.startsWith(".bash"),
      )
      .map((entry) => ({
        name: entry.name,
        type: entry.type,
        size: entry.size,
        modifyTime: entry.modifyTime,
      }));

    normalized.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );

    return normalized;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export type SftpDirSearchMatch = {
  fullPath: string;
  relativePath: string;
  matchedName: string;
};

function posixJoinSftp(base: string, name: string): string {
  const b = base.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  const n = name.replace(/^\/+/, "");
  if (b === "/") return `/${n}`;
  return `${b}/${n}`.replace(/\/{2,}/g, "/");
}

function relativePathFromRoot(
  rootNormalized: string,
  fullPath: string,
): string {
  const r = rootNormalized.replace(/\/+$/, "") || "/";
  const f = fullPath.replace(/\/{2,}/g, "/");
  if (f === r || f === `${r}/`) return "";
  const prefix = r === "/" ? "/" : `${r}/`;
  if (f.startsWith(prefix)) {
    return f.slice(prefix.length).replace(/^\/+/, "");
  }
  return fullPath.replace(/^\/+/, "");
}

/**
 * DFS từ rootPath, trả về các thư mục có tên hoặc đường dẫn tương đối chứa query (không phân biệt hoa thường).
 * Một kết nối SFTP, có giới hạn độ sâu và số kết quả.
 */
export async function searchSftpDirectoryTree(
  rootPath: string,
  query: string,
  options: { maxDepth?: number; limit?: number; config?: SftpConfig } = {},
): Promise<SftpDirSearchMatch[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const maxDepth = Math.min(24, Math.max(1, options.maxDepth ?? 14));
  const limit = Math.min(500, Math.max(1, options.limit ?? 250));
  const config = options.config ?? {};

  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizeRoot =
    (rootPath || "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

  const results: SftpDirSearchMatch[] = [];

  const isDir = (type: string) => type === "d" || type === "D";

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    async function listDirSafe(dir: string) {
      try {
        const raw = (await client.list(dir)) as {
          name: string;
          type: string;
          size: number;
          modifyTime?: number;
        }[];
        return raw.filter(
          (entry) =>
            entry.name &&
            !entry.name.startsWith(".") &&
            !entry.name.startsWith(".bash"),
        );
      } catch {
        return [];
      }
    }

    async function walk(dir: string, depth: number): Promise<void> {
      if (results.length >= limit || depth > maxDepth) return;

      const entries = await listDirSafe(dir);
      entries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );

      for (const entry of entries) {
        if (results.length >= limit) return;
        if (!isDir(entry.type)) continue;

        const fullPath = posixJoinSftp(dir, entry.name);
        const rel = relativePathFromRoot(normalizeRoot, fullPath);
        const nameLower = entry.name.toLowerCase();
        const relLower = rel.toLowerCase();

        if (nameLower.includes(q) || relLower.includes(q)) {
          results.push({
            fullPath,
            relativePath: rel,
            matchedName: entry.name,
          });
        }

        if (depth < maxDepth && results.length < limit) {
          await walk(fullPath, depth + 1);
        }
      }
    }

    await walk(normalizeRoot, 0);

    results.sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath, undefined, {
        numeric: true,
      }),
    );

    return results;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

/** Cây thư mục (chỉ folder), dùng cho snapshot JSON local. */
export type SftpDirTreeNode = {
  name: string;
  path: string;
  children: SftpDirTreeNode[];
};

function countDirTreeNodes(node: SftpDirTreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countDirTreeNodes(c), 0);
}

/**
 * Một kết nối SFTP: duyệt DFS từ root, chỉ lấy thư mục, dựng cây nested.
 * Có giới hạn độ sâu và số node để tránh treo với cây quá lớn.
 */
export async function mapSftpDirectoryTree(
  rootPath: string,
  options: {
    maxDepth?: number;
    maxNodes?: number;
    config?: SftpConfig;
  } = {},
): Promise<{
  sftpRoot: string;
  generatedAt: string;
  host: string;
  port: number;
  tree: SftpDirTreeNode;
  directoryCount: number;
}> {
  const maxDepth = Math.min(64, Math.max(1, options.maxDepth ?? 48));
  const maxNodes = Math.min(100_000, Math.max(1, options.maxNodes ?? 20_000));
  const config = options.config ?? {};

  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizeRoot =
    (rootPath || "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

  const isDir = (type: string) => type === "d" || type === "D";

  let visited = 0;

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    async function listDirSafe(dir: string) {
      try {
        const raw = (await client.list(dir)) as {
          name: string;
          type: string;
        }[];
        return raw.filter(
          (entry) =>
            entry.name &&
            !entry.name.startsWith(".") &&
            !entry.name.startsWith(".bash"),
        );
      } catch {
        return [];
      }
    }

    async function buildTree(
      dir: string,
      depth: number,
    ): Promise<SftpDirTreeNode> {
      visited += 1;
      const name =
        dir === "/" ? "/" : dir.split("/").filter(Boolean).pop() ?? dir;
      const node: SftpDirTreeNode = { name, path: dir, children: [] };

      if (depth >= maxDepth) {
        return node;
      }

      const entries = await listDirSafe(dir);
      entries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );

      for (const entry of entries) {
        if (!isDir(entry.type)) continue;
        if (visited >= maxNodes) break;
        const fullPath = posixJoinSftp(dir, entry.name);
        const child = await buildTree(fullPath, depth + 1);
        node.children.push(child);
      }

      return node;
    }

    const tree = await buildTree(normalizeRoot, 0);

    return {
      sftpRoot: normalizeRoot,
      generatedAt: new Date().toISOString(),
      host,
      port,
      tree,
      directoryCount: countDirTreeNodes(tree),
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function readSftpFile(path: string, config: SftpConfig = {}) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const data = await client.get(path);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    return buffer.toString("utf8");
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function writeSftpFile(
  path: string,
  content: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  try {
    const pathModule = await import("path");
    const dir = pathModule.dirname(path || "/");

    await client.connect({
      host,
      port,
      username,
      password,
    });

    if (dir && dir !== "." && dir !== "/") {
      await (client as any).mkdir(dir, true).catch(() => {
        // ignore mkdir errors (directory may already exist)
      });
    }

    const buffer = Buffer.from(content, "utf8");
    await client.put(buffer, path);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function deleteSftpPath(
  targetPath: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizedPath = (targetPath || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  if (!normalizedPath) {
    throw new Error("Missing SFTP path to delete.");
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const existsType = (await (client as any).exists(normalizedPath)) as
      | false
      | "d"
      | "-"
      | "l";

    if (!existsType) {
      throw new Error(`Path does not exist on SFTP: ${normalizedPath}`);
    }

    if (existsType === "d") {
      await (client as any).rmdir(normalizedPath, true);
    } else {
      await (client as any).delete(normalizedPath);
    }

    return {
      ok: true as const,
      path: normalizedPath,
      kind:
        existsType === "d"
          ? ("directory" as const)
          : existsType === "-"
            ? ("file" as const)
            : ("symlink" as const),
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function renameSftpPath(
  oldPath: string,
  newPath: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalize = (input: string) =>
    (input || "")
      .trim()
      .replace(/\\+/g, "/")
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");

  const normalizedOldPath = normalize(oldPath);
  const normalizedNewPath = normalize(newPath);

  if (!normalizedOldPath) {
    throw new Error("Missing source path.");
  }
  if (!normalizedNewPath) {
    throw new Error("Missing destination path.");
  }
  if (normalizedOldPath === normalizedNewPath) {
    return {
      ok: true as const,
      oldPath: normalizedOldPath,
      newPath: normalizedNewPath,
      renamed: false as const,
    };
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const oldType = (await (client as any).exists(normalizedOldPath)) as
      | false
      | "d"
      | "-"
      | "l";
    if (!oldType) {
      throw new Error(`Source path does not exist: ${normalizedOldPath}`);
    }

    const newType = (await (client as any).exists(normalizedNewPath)) as
      | false
      | "d"
      | "-"
      | "l";
    if (newType) {
      throw new Error(`Destination path already exists: ${normalizedNewPath}`);
    }

    await (client as any).rename(normalizedOldPath, normalizedNewPath);
    return {
      ok: true as const,
      oldPath: normalizedOldPath,
      newPath: normalizedNewPath,
      renamed: true as const,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function createSftpDirectory(
  targetPath: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizedPath = (targetPath || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  if (!normalizedPath) {
    throw new Error("Missing SFTP directory path.");
  }

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const existsType = (await (client as any).exists(normalizedPath)) as
      | false
      | "d"
      | "-"
      | "l";

    if (existsType === "d") {
      return {
        ok: true as const,
        path: normalizedPath,
        created: false as const,
      };
    }

    if (existsType === "-" || existsType === "l") {
      throw new Error(`A non-directory entry already exists: ${normalizedPath}`);
    }

    await (client as any).mkdir(normalizedPath, false);

    return {
      ok: true as const,
      path: normalizedPath,
      created: true as const,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function uploadSftpBuffer(
  path: string,
  content: Buffer,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  try {
    const pathModule = await import("path");
    const dir = pathModule.dirname(path || "/");

    await client.connect({
      host,
      port,
      username,
      password,
    });

    if (dir && dir !== "." && dir !== "/") {
      await (client as any).mkdir(dir, true).catch(() => {
        // ignore mkdir errors (directory may already exist)
      });
    }

    await client.put(content, path);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

function normalizeSftpRelativeDirKey(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function sftpDirRelativeKey(
  absoluteDir: string,
  rootDir: string,
): string {
  const dir = (absoluteDir || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  const root = (rootDir || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");
  if (!dir || dir === root) return "";
  const prefix = `${root}/`;
  if (dir.startsWith(prefix)) {
    return normalizeSftpRelativeDirKey(dir.slice(prefix.length));
  }
  return normalizeSftpRelativeDirKey(dir);
}

/** Lists source subdirectories whose matching target path already exists. */
export async function findExistingTargetDirectoriesUnderSource(
  sourcePath: string,
  targetPath: string,
  options: {
    sourceConfig?: SftpConfig;
    targetConfig?: SftpConfig;
  } = {},
): Promise<string[]> {
  const sourceClient = new SftpClient();
  const targetClient = new SftpClient();

  const normalize = (input: string) =>
    (input || "")
      .trim()
      .replace(/\\+/g, "/")
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");

  const normalizedSourcePath = normalize(sourcePath);
  const normalizedTargetPath = normalize(targetPath);
  if (!normalizedSourcePath || !normalizedTargetPath) {
    throw new Error("Missing source or target SFTP path.");
  }

  const sourceConfig = options.sourceConfig ?? {};
  const targetConfig = options.targetConfig ?? {};

  const sourceHost =
    sourceConfig.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const sourcePort = sourceConfig.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const sourceUsername = sourceConfig.username ?? process.env.SFTP_USER ?? "www-demo";
  const sourcePassword =
    sourceConfig.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  const targetHost =
    targetConfig.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const targetPort = targetConfig.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const targetUsername = targetConfig.username ?? process.env.SFTP_USER ?? "www-demo";
  const targetPassword =
    targetConfig.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  const existing: string[] = [];

  const walk = async (fromDir: string, toDir: string) => {
    const sourceType = (await (sourceClient as any).exists(fromDir)) as
      | false
      | "d"
      | "-"
      | "l";
    if (sourceType !== "d" && sourceType !== "D") return;

    const targetType = (await (targetClient as any).exists(toDir)) as
      | false
      | "d"
      | "-"
      | "l";
    if (targetType === "d" || targetType === "D") {
      existing.push(sftpDirRelativeKey(fromDir, normalizedSourcePath));
    }

    const entries = (await sourceClient.list(fromDir)) as {
      name: string;
      type: string;
    }[];
    for (const entry of entries) {
      if (!entry?.name || entry.name === "." || entry.name === "..") continue;
      if (entry.type !== "d" && entry.type !== "D") continue;
      const sourceChild = `${fromDir}/${entry.name}`.replace(/\/{2,}/g, "/");
      const targetChild = `${toDir}/${entry.name}`.replace(/\/{2,}/g, "/");
      await walk(sourceChild, targetChild);
    }
  };

  try {
    await sourceClient.connect({
      host: sourceHost,
      port: sourcePort,
      username: sourceUsername,
      password: sourcePassword,
    });
    await targetClient.connect({
      host: targetHost,
      port: targetPort,
      username: targetUsername,
      password: targetPassword,
    });

    const sourceType = (await (sourceClient as any).exists(normalizedSourcePath)) as
      | false
      | "d"
      | "-"
      | "l";
    if (!sourceType) {
      throw new Error(`Source path does not exist: ${normalizedSourcePath}`);
    }
    if (sourceType !== "d" && sourceType !== "D") {
      const targetType = (await (targetClient as any).exists(
        normalizedTargetPath,
      )) as false | "d" | "-" | "l";
      if (targetType) {
        existing.push("");
      }
      return existing;
    }

    await walk(normalizedSourcePath, normalizedTargetPath);
    return existing;
  } finally {
    try {
      await sourceClient.end();
    } catch {
      // ignore
    }
    try {
      await targetClient.end();
    } catch {
      // ignore
    }
  }
}

export async function copySftpPathBetweenConfigs(
  sourcePath: string,
  targetPath: string,
  options: {
    sourceConfig?: SftpConfig;
    targetConfig?: SftpConfig;
    /** When true, merge into an existing target directory instead of failing. */
    merge?: boolean;
    /** Skip subtrees when the matching target directory already exists. */
    skipExistingDirectories?: boolean;
    /** Relative directory keys (from source root) to merge/overwrite anyway. */
    overwriteDirectoryPaths?: string[];
  } = {},
) {
  const sourceClient = new SftpClient();
  const targetClient = new SftpClient();

  const normalize = (input: string) =>
    (input || "")
      .trim()
      .replace(/\\+/g, "/")
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");

  const normalizedSourcePath = normalize(sourcePath);
  const normalizedTargetPath = normalize(targetPath);

  if (!normalizedSourcePath) {
    throw new Error("Missing source SFTP path.");
  }
  if (!normalizedTargetPath) {
    throw new Error("Missing target SFTP path.");
  }

  const sourceConfig = options.sourceConfig ?? {};
  const targetConfig = options.targetConfig ?? {};

  const sourceHost =
    sourceConfig.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const sourcePort = sourceConfig.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const sourceUsername = sourceConfig.username ?? process.env.SFTP_USER ?? "www-demo";
  const sourcePassword =
    sourceConfig.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  const targetHost =
    targetConfig.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const targetPort = targetConfig.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const targetUsername = targetConfig.username ?? process.env.SFTP_USER ?? "www-demo";
  const targetPassword =
    targetConfig.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!sourceHost || !sourceUsername || !sourcePassword) {
    throw new Error("Missing source SFTP credentials (host/username/password).");
  }
  if (!targetHost || !targetUsername || !targetPassword) {
    throw new Error("Missing target SFTP credentials (host/username/password).");
  }

  let copiedFiles = 0;
  let copiedDirectories = 0;
  let createdTargetDirectory = false;
  const skippedDirectories: string[] = [];
  const overwriteDirectoryKeys = new Set(
    (options.overwriteDirectoryPaths ?? []).map((p) => normalizeSftpRelativeDirKey(p)),
  );

  const pathModule = await import("path");
  const ensureTargetDirectory = async (dirPath: string) => {
    if (!dirPath || dirPath === "." || dirPath === "/") return;
    await (targetClient as any).mkdir(dirPath, true).catch(() => {
      // ignore mkdir errors when directory already exists
    });
  };

  const copyFile = async (fromPath: string, toPath: string) => {
    const parentDir = pathModule.posix.dirname(toPath || "/");
    await ensureTargetDirectory(parentDir);
    const data = await sourceClient.get(fromPath);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    await targetClient.put(buffer, toPath);
    copiedFiles += 1;
  };

  const copyDirectoryRecursive = async (
    fromDir: string,
    toDir: string,
    isRoot = false,
  ) => {
    const relKey = sftpDirRelativeKey(fromDir, normalizedSourcePath);
    const targetExists = (await (targetClient as any).exists(toDir)) as
      | false
      | "d"
      | "-"
      | "l";

    if (targetExists === "-" || targetExists === "l") {
      throw new Error(`Destination path is not a directory: ${toDir}`);
    }

    const targetIsDir = targetExists === "d" || targetExists === "D";
    const shouldSkipSubtree =
      options.skipExistingDirectories === true &&
      targetIsDir &&
      !overwriteDirectoryKeys.has(relKey);

    if (shouldSkipSubtree) {
      skippedDirectories.push(relKey);
      return;
    }

    if (!targetExists) {
      await (targetClient as any).mkdir(toDir, true);
      copiedDirectories += 1;
      if (isRoot) createdTargetDirectory = true;
    }

    const entries = (await sourceClient.list(fromDir)) as {
      name: string;
      type: string;
    }[];

    for (const entry of entries) {
      if (!entry?.name || entry.name === "." || entry.name === "..") continue;
      const sourceEntryPath = `${fromDir}/${entry.name}`.replace(/\/{2,}/g, "/");
      const targetEntryPath = `${toDir}/${entry.name}`.replace(/\/{2,}/g, "/");

      if (entry.type === "d" || entry.type === "D") {
        await copyDirectoryRecursive(sourceEntryPath, targetEntryPath);
        continue;
      }

      await copyFile(sourceEntryPath, targetEntryPath);
    }
  };

  try {
    await sourceClient.connect({
      host: sourceHost,
      port: sourcePort,
      username: sourceUsername,
      password: sourcePassword,
    });
    await targetClient.connect({
      host: targetHost,
      port: targetPort,
      username: targetUsername,
      password: targetPassword,
    });

    const sourceType = (await (sourceClient as any).exists(normalizedSourcePath)) as
      | false
      | "d"
      | "-"
      | "l";
    if (!sourceType) {
      throw new Error(`Source path does not exist: ${normalizedSourcePath}`);
    }

    const targetType = (await (targetClient as any).exists(normalizedTargetPath)) as
      | false
      | "d"
      | "-"
      | "l";
    if (targetType) {
      const allowExistingTarget =
        options.merge === true || options.skipExistingDirectories === true;
      if (!allowExistingTarget) {
        throw new Error(`Destination path already exists: ${normalizedTargetPath}`);
      }
      const sourceIsDir = sourceType === "d" || sourceType === "D";
      const targetIsDir = targetType === "d" || targetType === "D";
      if (sourceIsDir && !targetIsDir) {
        throw new Error(
          `Cannot merge directory into non-directory: ${normalizedTargetPath}`,
        );
      }
      if (!sourceIsDir && targetIsDir) {
        throw new Error(
          `Cannot merge file into directory: ${normalizedTargetPath}`,
        );
      }
    }

    if (sourceType === "d" || sourceType === "D") {
      await copyDirectoryRecursive(
        normalizedSourcePath,
        normalizedTargetPath,
        true,
      );
    } else {
      await copyFile(normalizedSourcePath, normalizedTargetPath);
    }

    return {
      sourcePath: normalizedSourcePath,
      targetPath: normalizedTargetPath,
      sourceKind:
        sourceType === "d"
          ? ("directory" as const)
          : sourceType === "-"
            ? ("file" as const)
            : ("symlink" as const),
      copiedFiles,
      copiedDirectories,
      createdTargetDirectory,
      skippedDirectories,
    };
  } finally {
    try {
      await sourceClient.end();
    } catch {
      // ignore close errors
    }
    try {
      await targetClient.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function verifySftpWritableDirectory(
  targetDir: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizedDir = (targetDir || "/")
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "") || "/";

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    await (client as any).mkdir(normalizedDir, true).catch(() => {
      // ignore; may already exist or parent not writable
    });

    const existsType = (await (client as any).exists(normalizedDir)) as
      | false
      | "d"
      | "-"
      | "l";

    if (existsType !== "d") {
      throw new Error(`Remote directory does not exist: ${normalizedDir}`);
    }

    const probeName = `.cursor-write-check-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    const probePath = `${normalizedDir}/${probeName}`.replace(/\/{2,}/g, "/");

    await client.put(Buffer.from("ok", "utf8"), probePath);
    await (client as any).delete(probePath).catch(() => {
      // ignore cleanup failure
    });

    return { ok: true as const, path: normalizedDir };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function sftpPathExists(
  targetPath: string,
  config: SftpConfig = {},
  options: { scope?: "media" | "demo" } = {},
) {
  const client = new SftpClient();
  const scope = options.scope ?? "media";

  const host =
    config.host ??
    (scope === "demo" ? process.env.SFTP_HOST : process.env.SFTP_HOST_MEDIA);
  const portRaw =
    config.port ??
    (scope === "demo"
      ? process.env.SFTP_PORT
        ? Number(process.env.SFTP_PORT)
        : undefined
      : process.env.SFTP_PORT_MEDIA
        ? Number(process.env.SFTP_PORT_MEDIA)
        : undefined);
  const port = portRaw ?? 2122;
  const username =
    config.username ??
    (scope === "demo" ? process.env.SFTP_USER : process.env.SFTP_USER_MEDIA);
  const password =
    config.password ??
    (scope === "demo"
      ? process.env.SFTP_PASSWORD
      : process.env.SFTP_PASSWORD_MEDIA);

  if (!host || !username || !password) {
    throw new Error(
      scope === "demo"
        ? "Missing SFTP DEMO credentials. Please set SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD in .env"
        : "Missing SFTP MEDIA credentials. Please set SFTP_HOST_MEDIA, SFTP_PORT_MEDIA, SFTP_USER_MEDIA, SFTP_PASSWORD_MEDIA in .env",
    );
  }

  const rawPath = (targetPath || "").trim();
  const normalizedInput = (rawPath || "/").replace(/\\+/g, "/");

  let checkedPath = normalizedInput;
  if (scope === "media") {
    // Always check under /media (treat input as relative to /media unless already absolute /media/*)
    const MEDIA_ROOT = "media";
    if (checkedPath === "/") checkedPath = "";

    if (checkedPath.startsWith(MEDIA_ROOT + "/") || checkedPath === MEDIA_ROOT) {
      // keep as-is
    } else if (checkedPath.startsWith("/")) {
      checkedPath = `${MEDIA_ROOT}${checkedPath}`;
    } else {
      checkedPath = `${MEDIA_ROOT}/${checkedPath}`;
    }
  } else {
    checkedPath = checkedPath.replace(/\/+$/, "");
  }

  checkedPath = checkedPath.replace(/\/{2,}/g, "/");

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    // ssh2-sftp-client: exists() -> false | 'd' | '-' | 'l'
    const existsType = (await (client as any).exists(checkedPath)) as
      | false
      | "d"
      | "-"
      | "l";

    let hasIndexHtml: boolean | null = null;
    let message: string | null = null;

    if (existsType === "d") {
      const dirPath = checkedPath.endsWith("/")
        ? checkedPath
        : `${checkedPath}/`;
      const indexPath = `${dirPath}index.html`.replace(/\/{2,}/g, "/");
      const indexExistsType = (await (client as any).exists(indexPath)) as
        | false
        | "d"
        | "-"
        | "l";
      hasIndexHtml = indexExistsType === "-";
      if (hasIndexHtml) {
        message = "Banner can be set up";
      } else {
        message = "Directory exists but index.html is missing";
      }
    }

    return {
      checkedPath,
      exists: Boolean(existsType),
      type: existsType === false ? null : existsType,
      kind:
        existsType === "d"
          ? ("directory" as const)
          : existsType === "-"
            ? ("file" as const)
            : existsType === "l"
              ? ("symlink" as const)
              : null,
      hasIndexHtml,
      message,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}

export async function downloadSftpDirectoryAsZip(
  targetPath: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST ?? "upload.yomedia.vn";
  const port = config.port ?? Number(process.env.SFTP_PORT ?? 2122);
  const username = config.username ?? process.env.SFTP_USER ?? "www-demo";
  const password = config.password ?? process.env.SFTP_PASSWORD ?? "Ftp@dem0";

  if (!host || !username || !password) {
    throw new Error("Missing SFTP credentials (host/username/password).");
  }

  const normalizedPath = (targetPath || "")
    .trim()
    .replace(/\\+/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  if (!normalizedPath) {
    throw new Error("Missing SFTP directory path.");
  }

  const zip = new JSZip();
  let fileCount = 0;

  const addDirectoryToZip = async (remoteDir: string, localPrefix: string) => {
    const entries = (await client.list(remoteDir)) as {
      name: string;
      type: string;
      size: number;
    }[];

    for (const entry of entries) {
      if (!entry?.name || entry.name === "." || entry.name === "..") continue;
      const remotePath = `${remoteDir}/${entry.name}`.replace(/\/{2,}/g, "/");
      const zipPath = localPrefix ? `${localPrefix}/${entry.name}` : entry.name;

      if (entry.type === "d") {
        await addDirectoryToZip(remotePath, zipPath);
        continue;
      }

      const data = await client.get(remotePath);
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      zip.file(zipPath, buffer);
      fileCount += 1;
    }
  };

  try {
    await client.connect({
      host,
      port,
      username,
      password,
    });

    const existsType = (await (client as any).exists(normalizedPath)) as
      | false
      | "d"
      | "-"
      | "l";

    if (!existsType) {
      throw new Error(`Directory does not exist on SFTP: ${normalizedPath}`);
    }

    if (existsType !== "d") {
      throw new Error(`Path is not a directory: ${normalizedPath}`);
    }

    const baseName = normalizedPath.split("/").filter(Boolean).pop() || "bundle";
    await addDirectoryToZip(normalizedPath, "");
    if (fileCount === 0) {
      throw new Error(`No files found in directory: ${normalizedPath}`);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return {
      checkedPath: normalizedPath,
      fileCount,
      zipName: `${baseName}.zip`,
      zipBuffer,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}
