import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request } from "express";
import { getUserRole } from "./role.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROLE_PERMISSIONS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "role-permissions.json",
);

type RawPerms = Record<
  string,
  { manageDemo?: { canSwitchSftpHost?: boolean } }
>;

/** Reads JSON on disk (same file as server's role permission store). */
function readManageDemoMediaSwitchFlag(role: string): boolean {
  try {
    const raw = fs.readFileSync(ROLE_PERMISSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw) as RawPerms;
    const r = role.trim().toLowerCase();
    return parsed[r]?.manageDemo?.canSwitchSftpHost === true;
  } catch {
    return false;
  }
}

/**
 * Manage Demo · media SFTP host: requires `admin` plus
 * `manageDemo.canSwitchSftpHost` for the admin role in role-permissions.json.
 */
export function isManageDemoMediaSftpAllowed(req: Request): boolean {
  const role = String(getUserRole(req) ?? "")
    .trim()
    .toLowerCase();
  if (role !== "admin") return false;
  return readManageDemoMediaSwitchFlag(role);
}
