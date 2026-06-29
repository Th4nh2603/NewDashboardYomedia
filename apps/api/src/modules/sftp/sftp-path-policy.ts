import path from "node:path";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

export type SftpScope = "demo" | "media";

export function normalizeSftpPath(input: string): string {
  const normalized = path.posix.normalize(`/${input.trim().replace(/^\/+/, "")}`);
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

export function isWithinSftpRoot(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
}

export function getLogicalRoot(): string {
  return normalizeSftpPath(env.SFTP_ROOT);
}

export function assertSftpPathWithinRoot(inputPath: string): string {
  const logicalRoot = getLogicalRoot();
  const logicalPath = normalizeSftpPath(inputPath);

  if (!isWithinSftpRoot(logicalPath, logicalRoot)) {
    throw new AppError("SFTP path is outside the allowed root.", {
      statusCode: 400,
      code: "SFTP_PATH_OUTSIDE_ROOT",
      expose: true,
    });
  }

  return logicalPath;
}

export function resolveScopedRemotePath(input: {
  path: string;
  logicalRoot?: string;
  hostRoot: string;
}): string {
  const logicalRoot = normalizeSftpPath(input.logicalRoot ?? env.SFTP_ROOT);
  const logicalPath = assertSftpPathWithinRoot(input.path);
  const hostRoot = normalizeSftpPath(input.hostRoot);
  const relative = path.posix.relative(logicalRoot, logicalPath);
  const remote = normalizeSftpPath(path.posix.join(hostRoot, relative));

  if (!isWithinSftpRoot(remote, hostRoot)) {
    throw new AppError("SFTP path is outside the configured host root.", {
      statusCode: 400,
      code: "SFTP_PATH_OUTSIDE_ROOT",
      expose: true,
    });
  }

  return remote;
}
