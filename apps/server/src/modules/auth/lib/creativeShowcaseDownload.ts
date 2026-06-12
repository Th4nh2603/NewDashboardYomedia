import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request } from "express";
import { HttpError } from "../../../lib/http/errors.js";
import { getUserRole } from "./role.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROLE_PERMISSIONS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "role-permissions.json",
);

type Raw = Record<
  string,
  { creativeShowcase?: { canDownload?: boolean } } | undefined
>;

function readCanDownload(role: string): boolean {
  const r = role.trim().toLowerCase();
  try {
    const raw = fs.readFileSync(ROLE_PERMISSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Raw;
    const forRole = parsed[r]?.creativeShowcase?.canDownload;
    if (forRole === true) return true;
    if (forRole === false) return false;
    const defaultRaw = parsed.default?.creativeShowcase?.canDownload;
    if (defaultRaw === true) return true;
    if (defaultRaw === false) return false;
    // Legacy JSON without creativeShowcase: same as UI used to treat `media`.
    return r !== "media";
  } catch {
    return false;
  }
}

/** ZIP download (/api/sftp/download-directory): allowed only when role permits. */
export function assertCreativeShowcaseDownloadAllowed(req: Request): void {
  const role = String(getUserRole(req) ?? "").trim().toLowerCase();
  if (!role) {
    throw new HttpError(403, "Forbidden: Creative downloads require an authenticated role.", {
      code: "FORBIDDEN_DOWNLOAD",
    });
  }
  if (!readCanDownload(role)) {
    throw new HttpError(
      403,
      "Forbidden: your role cannot download Creative packages.",
      { code: "FORBIDDEN_DOWNLOAD" },
    );
  }
}
