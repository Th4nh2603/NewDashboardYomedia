import type { Request } from "express";
import { HttpError } from "../../../lib/http/errors.js";
import { getUserRole } from "../lib/role.js";
import { assertSftpUploadBinaryAllowed } from "../lib/sftpMutate.js";
import {
  isBuildDemoBrandAllowed,
  resolveCanonicalBuildDemoBrand,
} from "../../creative/repositories/brand.repository.js";
import { getAllowedRoutesByRole } from "./permissions.js";

function forbidden(code: string, message: string): never {
  throw new HttpError(403, message, { code });
}

export function assertRouteAllowed(req: Request, route: string): void {
  const role = String(getUserRole(req) ?? "").trim().toLowerCase();
  if (!role) {
    forbidden("FORBIDDEN_ROUTE", "Forbidden: authenticated role required.");
  }
  const allowed = getAllowedRoutesByRole(role);
  if (!allowed.includes(route)) {
    forbidden(
      "FORBIDDEN_ROUTE",
      `Forbidden: route "${route}" is not allowed for your role.`,
    );
  }
}

export function assertChatAccess(req: Request): void {
  assertRouteAllowed(req, "/chat");
}

export function assertBuildDemoSftpAllowed(req: Request): void {
  assertSftpUploadBinaryAllowed(req);
}

export function assertBuildDemoBrandPolicy(
  brandId: string,
  allowedBrands: string[] | null,
): void {
  const canonical = resolveCanonicalBuildDemoBrand(brandId);
  if (!canonical || !isBuildDemoBrandAllowed(canonical, allowedBrands)) {
    forbidden(
      "FORBIDDEN_BUILD_DEMO_BRAND",
      "Brand không hợp lệ hoặc tài khoản không được phép dùng brand này.",
    );
  }
}
