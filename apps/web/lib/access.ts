/** Routes reachable without signing in (see PrivateRoute). */
export const PUBLIC_ROUTES = new Set(["/creative"]);

/** Role constraints mirrored from App.tsx RoleRoute wrappers. */
export const ROUTE_ROLE_GUARDS: Record<
  string,
  { allow?: string[]; deny?: string[] }
> = {
  "/manage-sftp": { allow: ["admin"] },
  "/test-data": { deny: ["guest"] },
  "/creative-demos-edit": { allow: ["admin"] },
  "/smtp-mail": { deny: ["guest"] },
  "/admin/users": { allow: ["admin"] },
  "/tool/test": { allow: ["admin"] },
};

/** Tools section — visible in sidebar only for admin. */
export const TOOLS_ADMIN_ROUTES = ["/tool/test"] as const;

/** Sidebar admin section — shown only when role is admin. */
export const ADMIN_SECTION_ROUTES = [
  "/admin/users",
  "/creative-demos-edit",
  "/manage-sftp",
  "/smtp-mail",
] as const;

export type AccessAction = "admin" | "adminOfflineMode";

const ACCESS_ACTIONS = new Set<string>(["admin", "adminOfflineMode"]);

export function isAccessAction(value: string): value is AccessAction {
  return ACCESS_ACTIONS.has(value);
}

export type AccessUser = {
  role?: string;
  allowedRoutes?: string[];
};

export type AccessContext = {
  role: string;
  allowedRouteSet: Set<string>;
  hasAllowedRouteConfig: boolean;
  defaultAllowedRoute: string;
};

export function buildAccessContext(user: AccessUser | null | undefined): AccessContext {
  const role = String(user?.role ?? "")
    .trim()
    .toLowerCase();
  const allowedRoutes = Array.isArray(user?.allowedRoutes)
    ? user.allowedRoutes
    : [];
  const allowedRouteSet = new Set(allowedRoutes);
  const hasAllowedRouteConfig = allowedRouteSet.size > 0;
  return {
    role,
    allowedRouteSet,
    hasAllowedRouteConfig,
    defaultAllowedRoute: allowedRoutes[0] || "/",
  };
}

function passesRoleGuard(
  role: string,
  guard: { allow?: string[]; deny?: string[] } | undefined,
): boolean {
  if (!guard) return true;
  const denied = new Set(
    (guard.deny ?? []).map((r) => r.trim().toLowerCase()),
  );
  if (denied.has(role)) return false;
  const allowed = (guard.allow ?? []).map((r) => r.trim().toLowerCase());
  if (allowed.length > 0 && !allowed.includes(role)) return false;
  return true;
}

function passesAllowedRoutes(
  ctx: AccessContext,
  path: string,
): boolean {
  if (!ctx.hasAllowedRouteConfig) return true;
  return ctx.allowedRouteSet.has(path);
}

/** Route visible in sidebar nav (includes admin-section role gate). */
export function canShowNavRoute(ctx: AccessContext, path: string): boolean {
  if (
    (ADMIN_SECTION_ROUTES as readonly string[]).includes(path) &&
    ctx.role !== "admin"
  ) {
    return false;
  }
  if ((TOOLS_ADMIN_ROUTES as readonly string[]).includes(path)) {
    return ctx.role === "admin" && passesAllowedRoutes(ctx, path);
  }
  return passesAllowedRoutes(ctx, path);
}

export function canAccessRoute(
  ctx: AccessContext,
  path: string,
): boolean {
  const normalized = path || "/";
  if (PUBLIC_ROUTES.has(normalized)) return true;
  if (!passesAllowedRoutes(ctx, normalized)) return false;
  return passesRoleGuard(ctx.role, ROUTE_ROLE_GUARDS[normalized]);
}

export function canAccessAction(
  ctx: AccessContext,
  action: AccessAction,
): boolean {
  switch (action) {
    case "admin":
    case "adminOfflineMode":
      return ctx.role === "admin";
    default:
      return false;
  }
}

export function canAccess(
  ctx: AccessContext,
  routeOrAction: string,
): boolean {
  if (isAccessAction(routeOrAction)) {
    return canAccessAction(ctx, routeOrAction);
  }
  return canAccessRoute(ctx, routeOrAction);
}
