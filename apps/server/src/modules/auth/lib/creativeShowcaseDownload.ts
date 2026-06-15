import type { Request } from "express";
import { HttpError } from "../../../lib/http/errors.js";
import { canDownloadCreativeShowcase } from "../services/permissions.js";
import { getUserRole } from "./role.js";

/** ZIP download (/api/sftp/download-directory): allowed only when role permits. */
export function assertCreativeShowcaseDownloadAllowed(req: Request): void {
  const role = String(getUserRole(req) ?? "").trim().toLowerCase();
  if (!role) {
    throw new HttpError(
      403,
      "Forbidden: Creative downloads require an authenticated role.",
      { code: "FORBIDDEN_DOWNLOAD" },
    );
  }
  if (!canDownloadCreativeShowcase(role)) {
    throw new HttpError(
      403,
      "Forbidden: your role cannot download Creative packages.",
      { code: "FORBIDDEN_DOWNLOAD" },
    );
  }
}
