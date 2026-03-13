import SftpClient from "ssh2-sftp-client";

export interface SftpConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export async function testSftpConnection(config: SftpConfig) {
  const client = new SftpClient();

  const host =
    config.host ??
    process.env.SFTP_HOST ??
    "upload.yomedia.vn";
  const port =
    config.port ??
    Number(process.env.SFTP_PORT ?? 2122);
  const username =
    config.username ??
    process.env.SFTP_USER ??
    "www-demo";
  const password =
    config.password ??
    process.env.SFTP_PASSWORD ??
    "Ftp@dem0";

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

export async function listSftpDirectory(
  path: string,
  config: SftpConfig = {},
) {
  const client = new SftpClient();

  const host =
    config.host ??
    process.env.SFTP_HOST ??
    "upload.yomedia.vn";
  const port =
    config.port ??
    Number(process.env.SFTP_PORT ?? 2122);
  const username =
    config.username ??
    process.env.SFTP_USER ??
    "www-demo";
  const password =
    config.password ??
    process.env.SFTP_PASSWORD ??
    "Ftp@dem0";

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

    const entries = await client.list(path || "/") as { name: string; type: string; size: number; modifyTime?: number }[];

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

  const host =
    config.host ??
    process.env.SFTP_HOST ??
    "upload.yomedia.vn";
  const port =
    config.port ??
    Number(process.env.SFTP_PORT ?? 2122);
  const username =
    config.username ??
    process.env.SFTP_USER ??
    "www-demo";
  const password =
    config.password ??
    process.env.SFTP_PASSWORD ??
    "Ftp@dem0";

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

  const host =
    config.host ??
    process.env.SFTP_HOST ??
    "upload.yomedia.vn";
  const port =
    config.port ??
    Number(process.env.SFTP_PORT ?? 2122);
  const username =
    config.username ??
    process.env.SFTP_USER ??
    "www-demo";
  const password =
    config.password ??
    process.env.SFTP_PASSWORD ??
    "Ftp@dem0";

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
