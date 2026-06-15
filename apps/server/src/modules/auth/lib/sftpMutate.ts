import type { Request } from "express";
import { HttpError } from "../../../lib/http/errors.js";
import {
  getSftpAclByRole,
  type SftpAclField as SftpAclKey,
} from "../services/permissions.js";
import { getUserRole } from "./role.js";

function forbid(code: string, msg: string): never {
  throw new HttpError(403, msg, { code });
}

function gate(req: Request, field: SftpAclKey, msg: string): void {
  const role = String(getUserRole(req) ?? "")
    .trim()
    .toLowerCase();
  if (!role) {
    forbid(
      "FORBIDDEN_SFTP_ACL",
      "Forbidden: SFTP actions require an authenticated role.",
    );
  }
  const acl = getSftpAclByRole(role);
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
