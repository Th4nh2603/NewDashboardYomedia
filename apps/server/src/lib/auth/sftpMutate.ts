import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request } from "express";
import { HttpError } from "../http/errors.js";
import { getUserRole } from "./role.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROLE_PERMISSIONS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "role-permissions.json",
);

export type SftpAclKey =
  | "canSftpUploadBinary"
  | "canSftpWriteFile"
  | "canSftpDelete"
  | "canSftpRename"
  | "canSftpMkdir";

type ManageDemoSlice = {
  canUseFileActionButtons?: boolean;
  canEditDeleteSftp?: boolean;
  canSftpUploadBinary?: boolean;
  canSftpWriteFile?: boolean;
  canSftpDelete?: boolean;
  canSftpRename?: boolean;
  canSftpMkdir?: boolean;
};

type Raw = Record<
  string,
  | {
      manageDemo?: ManageDemoSlice;
    }
  | undefined
>;

/** Legacy bundle: deprecated canEditDeleteSftp or canUseFileActionButtons. */
function resolveLegacyBundle(md: ManageDemoSlice | undefined): boolean {
  if (md?.canEditDeleteSftp === true) return true;
  if (md?.canEditDeleteSftp === false) return false;
  return md?.canUseFileActionButtons === true;
}

function resolveField(md: ManageDemoSlice | undefined, field: SftpAclKey): boolean {
  const v = md?.[field];
  if (v === true) return true;
  if (v === false) return false;
  return resolveLegacyBundle(md);
}

function readAcl(roleRaw: string): Record<SftpAclKey, boolean> | null {
  const r = roleRaw.trim().toLowerCase();
  try {
    const raw = fs.readFileSync(ROLE_PERMISSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Raw;
    const block =
      (parsed[r]?.manageDemo ?? parsed.default?.manageDemo) ??
      undefined;
    return {
      canSftpUploadBinary: resolveField(block, "canSftpUploadBinary"),
      canSftpWriteFile: resolveField(block, "canSftpWriteFile"),
      canSftpDelete: resolveField(block, "canSftpDelete"),
      canSftpRename: resolveField(block, "canSftpRename"),
      canSftpMkdir: resolveField(block, "canSftpMkdir"),
    };
  } catch {
    return null;
  }
}

function forbid(code: string, msg: string): never {
  throw new HttpError(403, msg, { code });
}

function gate(req: Request, field: SftpAclKey, msg: string): void {
  const role = String(getUserRole(req) ?? "").trim().toLowerCase();
  if (!role) {
    forbid("FORBIDDEN_SFTP_ACL", "Forbidden: SFTP actions require an authenticated role.");
  }
  const acl = readAcl(role);
  if (!acl?.[field]) {
    forbid("FORBIDDEN_SFTP_ACL", msg);
  }
}

export function assertSftpUploadBinaryAllowed(req: Request): void {
  gate(
    req,
    "canSftpUploadBinary",
    "Forbidden: your role cannot upload binary files to SFTP (POST /write-binary).",
  );
}

export function assertSftpWriteFileAllowed(req: Request): void {
  gate(
    req,
    "canSftpWriteFile",
    "Forbidden: your role cannot write text/binary via SFTP (POST /write).",
  );
}

export function assertSftpDeleteAllowed(req: Request): void {
  gate(
    req,
    "canSftpDelete",
    "Forbidden: your role cannot delete SFTP paths (POST /delete).",
  );
}

export function assertSftpRenameAllowed(req: Request): void {
  gate(
    req,
    "canSftpRename",
    "Forbidden: your role cannot rename SFTP paths (POST /rename).",
  );
}

export function assertSftpMkdirAllowed(req: Request): void {
  gate(
    req,
    "canSftpMkdir",
    "Forbidden: your role cannot create SFTP directories (POST /mkdir).",
  );
}
