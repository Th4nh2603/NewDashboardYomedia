import SftpClient from "ssh2-sftp-client";
import JSZip from "jszip";

export interface SftpConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
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

    const entries = (await client.list(path || "/")) as {
      name: string;
      type: string;
      size: number;
      modifyTime?: number;
    }[];

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
        message = "Banner có thể setup";
      } else {
        message = "Directory tồn tại nhưng không có file index.html";
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
