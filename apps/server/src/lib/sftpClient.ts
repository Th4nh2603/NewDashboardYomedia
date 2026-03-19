import SftpClient from "ssh2-sftp-client";

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

export async function sftpPathExists(
  targetPath: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host = config.host ?? process.env.SFTP_HOST_MEDIA;
  const portRaw =
    config.port ??
    (process.env.SFTP_PORT_MEDIA
      ? Number(process.env.SFTP_PORT_MEDIA)
      : undefined);
  const port = portRaw ?? 2122;
  const username = config.username ?? process.env.SFTP_USER_MEDIA;
  const password = config.password ?? process.env.SFTP_PASSWORD_MEDIA;

  if (!host || !username || !password) {
    throw new Error(
      "Missing SFTP MEDIA credentials. Please set SFTP_HOST_MEDIA, SFTP_PORT_MEDIA, SFTP_USER_MEDIA, SFTP_PASSWORD_MEDIA in .env",
    );
  }

  const rawPath = (targetPath || "").trim();
  const normalizedInput = (rawPath || "/").replace(/\\+/g, "/");

  // Always check under /media (treat input as relative to /media unless already absolute /media/*)
  const MEDIA_ROOT = "media";
  let checkedPath = normalizedInput;
  if (checkedPath === "/") checkedPath = "";

  if (checkedPath.startsWith(MEDIA_ROOT + "/") || checkedPath === MEDIA_ROOT) {
    // keep as-is
  } else if (checkedPath.startsWith("/")) {
    checkedPath = `${MEDIA_ROOT}${checkedPath}`;
  } else {
    checkedPath = `${MEDIA_ROOT}/${checkedPath}`;
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
