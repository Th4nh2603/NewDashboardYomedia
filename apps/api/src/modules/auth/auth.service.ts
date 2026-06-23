import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "../../config/env.js";
import { permissions } from "../../shared/constants/permissions.js";
import type { AuthenticatedUser, AuthMeResult } from "./auth.types.js";

const BASE_ALLOWED_ROUTES = [
  "/",
  "/chat",
  "/vision",
  "/image-generator",
  "/creative",
  "/document",
  "/documentation",
  "/manage-demo",
  "/bar",
  "/cinema",
  "/live",
  "/ai-gmail",
];

const ADMIN_EXTRA_ROUTES = [
  "/manage-sftp",
  "/admin/users",
  "/creative-demos-edit",
  "/history",
  "/tool/test",
];

const DESIGN_EXTRA_ROUTES = ["/build-demo", "/upload"];
const NON_GUEST_EXTRA_ROUTES = ["/test-data", "/smtp-mail"];

type ClerkTokenClaims = {
  sub: string;
  [key: string]: unknown;
};

function normalizeRole(value: unknown): string {
  const role = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (role === "adsopmanager") return "manager";
  return role || "guest";
}

function roleTitleFromRole(role: string): string {
  if (role === "admin") return "Administrator";
  if (role === "manager") return "Manager";
  if (role === "design") return "Design";
  if (role === "guest") return "Guest";
  return "User";
}

function getAllowedRoutesByRole(role: string): string[] {
  const routes = new Set(BASE_ALLOWED_ROUTES);
  if (role !== "guest") {
    NON_GUEST_EXTRA_ROUTES.forEach((route) => routes.add(route));
  }
  if (["admin", "design", "media", "manager"].includes(role)) {
    routes.add("/build-demo");
  }
  if (role === "admin" || role === "design") {
    routes.add("/upload");
  }
  if (role === "admin") {
    ADMIN_EXTRA_ROUTES.forEach((route) => routes.add(route));
  }
  DESIGN_EXTRA_ROUTES.forEach((route) => {
    if (role === "design") routes.add(route);
  });
  return Array.from(routes);
}

function parseAuthorizedParties(): string[] | undefined {
  const parts = env.CLERK_AUTHORIZED_PARTIES.split(/[,|\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

async function verifyClerkBearerToken(token: string): Promise<ClerkTokenClaims> {
  const secretKey = env.CLERK_SECRET_KEY.trim();
  const jwtKey = env.CLERK_JWT_KEY.trim();
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }

  const authorizedParties = parseAuthorizedParties();
  const claims = await verifyToken(token, {
    clockSkewInMs: 60_000,
    ...(authorizedParties ? { authorizedParties } : {}),
    ...(jwtKey ? { jwtKey } : { secretKey }),
  });
  const sub = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!sub) {
    throw new Error("Invalid Clerk token payload: missing sub");
  }
  return { ...claims, sub } as ClerkTokenClaims;
}

function metadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metadataStringArray(
  metadata: Record<string, unknown>,
  key: string,
): string[] {
  const value = metadata[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveUserPermissions(metadata: Record<string, unknown>): string[] {
  return Array.from(
    new Set([...metadataStringArray(metadata, "permissions"), permissions.chatUse]),
  );
}

function metadataNullableStringArray(
  metadata: Record<string, unknown>,
  key: string,
): string[] | null | undefined {
  const value = metadata[key];
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isClerkAuthConfigured(): boolean {
  return Boolean(env.CLERK_SECRET_KEY.trim());
}

export async function resolveAuthenticatedUser(
  token: string | null,
): Promise<AuthenticatedUser | null> {
  if (!isClerkAuthConfigured()) return null;
  if (!token) return null;

  const claims = await verifyClerkBearerToken(token);
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const clerkUser = await clerk.users.getUser(claims.sub);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );
  const publicMetadata = clerkUser.publicMetadata as Record<string, unknown>;
  const role = normalizeRole(publicMetadata.role);
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.fullName ||
    clerkUser.username ||
    primaryEmail?.emailAddress ||
    "User";

  return {
    id: clerkUser.id,
    clerkUserId: clerkUser.id,
    tenantId: metadataText(publicMetadata, "tenantId") ?? "default",
    email: primaryEmail?.emailAddress ?? "",
    name,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    imageUrl: clerkUser.imageUrl,
    role,
    roleTitle: metadataText(publicMetadata, "roleTitle") ?? roleTitleFromRole(role),
    permissions: resolveUserPermissions(publicMetadata),
    allowedRoutes: getAllowedRoutesByRole(role),
    allowedBrandIds: metadataStringArray(publicMetadata, "allowedBrandIds"),
    allowedKnowledgeBaseIds: metadataStringArray(
      publicMetadata,
      "allowedKnowledgeBaseIds",
    ),
    allowedMcpTools: metadataStringArray(publicMetadata, "allowedMcpTools"),
    allowedBuildDemoBrands: metadataNullableStringArray(
      publicMetadata,
      "allowedBuildDemoBrands",
    ),
  };
}

export function buildAuthMeResult(
  user: AuthenticatedUser,
  name?: string,
): AuthMeResult {
  const requestedName = name?.trim().toLowerCase();
  const nameMatched =
    !requestedName || user.name.trim().toLowerCase() === requestedName;

  return {
    ok: true,
    nameMatched,
    isGuest: user.role === "guest",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleTitle: user.roleTitle,
      status: "active",
      allowedRoutes: user.allowedRoutes,
      ...(user.allowedBuildDemoBrands !== undefined
        ? { allowedBuildDemoBrands: user.allowedBuildDemoBrands }
        : {}),
    },
  };
}
