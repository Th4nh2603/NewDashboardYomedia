import SftpClient from "ssh2-sftp-client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../shared/logger/logger.js";
import {
  normalizeSftpPath,
  resolveScopedRemotePath,
  type SftpScope,
} from "./sftp-path-policy.js";

const sftpScopeSchema = z.enum(["demo", "media"]).default("demo");

export const sftpListQuerySchema = z.object({
  path: z.string().trim().min(1).max(500),
  scope: sftpScopeSchema.optional(),
});
export const sftpWriteSchema = sftpListQuerySchema.extend({
  content: z.string().max(2_000_000),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});
export const sftpRenameSchema = z.object({
  oldPath: z.string().trim().min(1).max(500),
  newPath: z.string().trim().min(1).max(500),
  scope: sftpScopeSchema.optional(),
});

export type SftpListQuery = z.infer<typeof sftpListQuerySchema>;
export type SftpWriteInput = z.infer<typeof sftpWriteSchema>;
export type SftpRenameInput = z.infer<typeof sftpRenameSchema>;

type SftpConnectionConfig = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  root: string;
};

type RawSftpEntry = {
  name: string;
  type: string;
  size?: number;
  modifyTime?: number;
};

async function withSftpClient<T>(
  scope: SftpScope,
  operation: (client: SftpClient, config: SftpConnectionConfig) => Promise<T>,
): Promise<T> {
  const config = getConnectionConfig(scope);
  assertConnectionConfig(config);
  const client = new SftpClient();

  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      ...(config.password ? { password: config.password } : {}),
      ...(config.privateKey ? { privateKey: config.privateKey } : {}),
    });
    return await operation(client, config);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore disconnect errors after the request has already completed.
    }
  }
}

function getConnectionConfig(scope: SftpScope): SftpConnectionConfig {
  if (scope === "media") {
    return {
      host: env.SFTP_MEDIA_HOST || env.SFTP_HOST,
      port: env.SFTP_MEDIA_PORT || env.SFTP_PORT,
      username: env.SFTP_MEDIA_USERNAME || env.SFTP_USERNAME,
      password: env.SFTP_MEDIA_PASSWORD || env.SFTP_PASSWORD || undefined,
      privateKey:
        env.SFTP_MEDIA_PRIVATE_KEY || env.SFTP_PRIVATE_KEY || undefined,
      root: normalizeSftpPath(env.SFTP_MEDIA_ROOT || env.SFTP_ROOT),
    };
  }

  return {
    host: env.SFTP_HOST,
    port: env.SFTP_PORT,
    username: env.SFTP_USERNAME,
    password: env.SFTP_PASSWORD || undefined,
    privateKey: env.SFTP_PRIVATE_KEY || undefined,
    root: normalizeSftpPath(env.SFTP_ROOT),
  };
}

function assertConnectionConfig(config: SftpConnectionConfig): void {
  if (!config.host || !config.username) {
    throw new AppError("SFTP server is not configured.", {
      statusCode: 503,
      code: "SFTP_NOT_CONFIGURED",
      expose: true,
    });
  }
  if (!config.password && !config.privateKey) {
    throw new AppError("SFTP credentials are not configured.", {
      statusCode: 503,
      code: "SFTP_NOT_CONFIGURED",
      expose: true,
    });
  }
}

function resolveRemotePath(inputPath: string, config: SftpConnectionConfig): string {
  return resolveScopedRemotePath({ path: inputPath, hostRoot: config.root });
}

function toEntry(entry: RawSftpEntry) {
  return {
    name: String(entry.name ?? ""),
    type: String(entry.type ?? ""),
    size: Number.isFinite(Number(entry.size)) ? Number(entry.size) : 0,
    modifyTime: Number.isFinite(Number(entry.modifyTime))
      ? Number(entry.modifyTime)
      : undefined,
  };
}

export async function listSftpEntries(input: SftpListQuery) {
  const parsed = sftpListQuerySchema.parse(input);
  const scope = parsed.scope ?? "demo";

  try {
    return await withSftpClient(scope, async (client, config) => {
      const remotePath = resolveRemotePath(parsed.path, config);
      const entries = (await client.list(remotePath)) as RawSftpEntry[];
      return {
        ok: true,
        entries: entries.map(toEntry),
      };
    });
  } catch (error) {
    logger.warn("[sftp.list.failed]", {
      event: "sftp.list.failed",
      scope,
      path: parsed.path,
      error,
    });
    throw new AppError("Unable to list SFTP path.", {
      statusCode: 502,
      code: "SFTP_LIST_FAILED",
      expose: true,
      cause: error,
    });
  }
}

export async function sftpExists(input: SftpListQuery) {
  const parsed = sftpListQuerySchema.parse(input);
  const scope = parsed.scope ?? "demo";

  try {
    return await withSftpClient(scope, async (client, config) => {
      const remotePath = resolveRemotePath(parsed.path, config);
      const kind = await client.exists(remotePath);
      return { ok: true, exists: Boolean(kind), kind: kind || undefined };
    });
  } catch (error) {
    logger.warn("[sftp.exists.failed]", {
      event: "sftp.exists.failed",
      scope,
      path: parsed.path,
      error,
    });
    throw new AppError("Unable to check SFTP path.", {
      statusCode: 502,
      code: "SFTP_EXISTS_FAILED",
      expose: true,
      cause: error,
    });
  }
}

export async function mkdirSftpDirectory(input: SftpListQuery) {
  const parsed = sftpListQuerySchema.parse(input);
  const scope = parsed.scope ?? "demo";
  return withSftpClient(scope, async (client, config) => {
    const remotePath = resolveRemotePath(parsed.path, config);
    await client.mkdir(remotePath, true);
    return { ok: true, path: parsed.path };
  });
}

export async function writeSftpFile(input: SftpWriteInput) {
  const parsed = sftpWriteSchema.parse(input);
  const scope = parsed.scope ?? "demo";
  return withSftpClient(scope, async (client, config) => {
    const remotePath = resolveRemotePath(parsed.path, config);
    const buffer =
      parsed.encoding === "base64"
        ? Buffer.from(parsed.content, "base64")
        : Buffer.from(parsed.content, "utf8");
    await client.put(buffer, remotePath);
    return { ok: true, path: parsed.path, bytes: buffer.byteLength };
  });
}

export async function deleteSftpPath(input: SftpListQuery) {
  const parsed = sftpListQuerySchema.parse(input);
  const scope = parsed.scope ?? "demo";
  return withSftpClient(scope, async (client, config) => {
    const remotePath = resolveRemotePath(parsed.path, config);
    const kind = await client.exists(remotePath);
    if (!kind) return { ok: true, path: parsed.path, deleted: false };
    if (kind === "d") {
      await client.rmdir(remotePath, true);
    } else {
      await client.delete(remotePath);
    }
    return { ok: true, path: parsed.path, deleted: true };
  });
}

export async function renameSftpPath(input: SftpRenameInput) {
  const parsed = sftpRenameSchema.parse(input);
  const scope = parsed.scope ?? "demo";
  return withSftpClient(scope, async (client, config) => {
    const oldRemotePath = resolveRemotePath(parsed.oldPath, config);
    const newRemotePath = resolveRemotePath(parsed.newPath, config);
    await client.rename(oldRemotePath, newRemotePath);
    return { ok: true, oldPath: parsed.oldPath, newPath: parsed.newPath };
  });
}

export async function overwriteSftpFile(input: SftpWriteInput) {
  return writeSftpFile(input);
}
