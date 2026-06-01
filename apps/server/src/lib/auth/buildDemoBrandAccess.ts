import type { Request } from "express";
import { HttpError } from "../http/errors.js";
import {
  isBuildDemoBrandAllowed,
  resolveCanonicalBuildDemoBrand,
} from "../buildDemoBrands.js";
import {
  loadAccounts,
  normalizeAccountText,
  type Account,
} from "./accounts.js";
import { getVerifiedEmail } from "./clerkAuth.js";
import { getUserRole } from "./role.js";
import { resolveAllowedBuildDemoBrands } from "../../services/permissions.js";

const DEMO_UPLOAD_PATH_RE = /^\/script\/demo\/\d{4}\/\d{1,2}\/([^/]+)(?:\/|$)/i;

export function isDemoSftpUploadPath(remotePath: string): boolean {
  const normalized = String(remotePath || "").replace(/\\/g, "/").trim();
  return DEMO_UPLOAD_PATH_RE.test(normalized);
}

export function extractBrandFromDemoSftpPath(remotePath: string): string | null {
  const normalized = String(remotePath || "").replace(/\\/g, "/").trim();
  const match = normalized.match(DEMO_UPLOAD_PATH_RE);
  if (!match?.[1]) return null;
  return resolveCanonicalBuildDemoBrand(match[1]) ?? match[1];
}

function getRequestAccount(req: Request): Account | null {
  const direct = req.verifiedAuth?.account;
  if (direct) return direct;

  const email = getVerifiedEmail(req);
  if (!email) return null;

  return (
    loadAccounts().find(
      (item) =>
        normalizeAccountText(item.email) === normalizeAccountText(email),
    ) ?? null
  );
}

export function getAllowedBuildDemoBrandsForRequest(
  req: Request,
): string[] | null {
  const role = String(getUserRole(req) ?? "")
    .trim()
    .toLowerCase();
  if (role === "admin") return null;

  const account = getRequestAccount(req);
  if (!account) return [];

  return resolveAllowedBuildDemoBrands(account);
}

export function assertBuildDemoBrandSftpAccess(
  req: Request,
  remotePath: string,
): void {
  const brand = extractBrandFromDemoSftpPath(remotePath);
  if (!brand) return;

  const allowed = getAllowedBuildDemoBrandsForRequest(req);
  if (isBuildDemoBrandAllowed(brand, allowed)) return;

  throw new HttpError(
    403,
    `Forbidden: your account is not allowed to upload demo for brand "${brand}".`,
    { code: "FORBIDDEN_BUILD_DEMO_BRAND" },
  );
}

/** Demo folder delete via chat — administrators only. */
export function assertAdminDemoSftpDeleteAllowed(
  req: Request,
  remotePath: string,
): void {
  if (!isDemoSftpUploadPath(remotePath)) return;
  const role = String(getUserRole(req) ?? "")
    .trim()
    .toLowerCase();
  if (role === "admin") return;
  throw new HttpError(
    403,
    "Forbidden: only administrators can delete demo folders.",
    { code: "FORBIDDEN_DEMO_DELETE" },
  );
}
