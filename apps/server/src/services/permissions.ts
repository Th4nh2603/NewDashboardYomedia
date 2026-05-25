import fs from "fs";
import {
  type Account,
  loadAccounts,
  saveAccounts,
  migrateLegacyRoleKey,
  normalizeAccountText,
} from "../lib/auth/accounts.js";
import {
  getBuildDemoBrandOptions,
  normalizeBuildDemoBrandIds,
} from "../lib/buildDemoBrands.js";
import { rolePermissionsPath } from "./paths.js";

export type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
      /** Admin only: switch Manage Demo between demo / media SFTP host. */
      canSwitchSftpHost?: boolean;
      /** Build Demo: copy converted upload from demo SFTP to media SFTP. */
      canSetupMediaSftp?: boolean;
      /** Build Demo: empty = all brands; non-empty = restrict brand picker & uploads. */
      allowedBuildDemoBrands?: string[];
      /** @deprecated Loaded for backward compat; not written by normalize. */
      canEditDeleteSftp?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
      canSftpRename?: boolean;
      canSftpMkdir?: boolean;
    };
    routeAccess?: {
      allowedRoutes?: string[];
    };
    /** Creative page — ZIP download of demo folders. */
    creativeShowcase?: {
      canDownload?: boolean;
    };
  }
>;

let rolePermissionsCache: RolePermissionConfig | null = null;

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
];
const DESIGN_EXTRA_ROUTES = ["/build-demo", "/upload"];
const NON_GUEST_EXTRA_ROUTES = ["/test-data", "/smtp-mail"];
export const ALL_ALLOWED_ROUTES = Array.from(
  new Set([
    ...BASE_ALLOWED_ROUTES,
    ...NON_GUEST_EXTRA_ROUTES,
    ...DESIGN_EXTRA_ROUTES,
    ...ADMIN_EXTRA_ROUTES,
  ]),
);

const normalizeText = normalizeAccountText;

function migrateRolePermissionSlugKeys(
  input: RolePermissionConfig,
): RolePermissionConfig {
  const p = input as Record<string, (typeof input)[string]>;
  if (p.adsopmanager === undefined) return input;
  const next: Record<string, (typeof input)[string]> = { ...p };
  delete next.adsopmanager;
  if (next.manager === undefined) {
    next.manager = p.adsopmanager;
  }
  return next as RolePermissionConfig;
}

export function getDefaultAllowedRoutesByRole(roleRaw: string | undefined): string[] {
  const role = normalizeText(roleRaw);
  const routes = new Set(BASE_ALLOWED_ROUTES);

  if (role !== "guest") {
    routes.add("/test-data");
    routes.add("/smtp-mail");
  }
  if (
    role === "admin" ||
    role === "design" ||
    role === "media" ||
    role === "manager"
  ) {
    routes.add("/build-demo");
  }
  if (role === "admin" || role === "design") {
    routes.add("/upload");
  }
  if (role === "admin") {
    routes.add("/manage-sftp");
    routes.add("/admin/users");
    routes.add("/creative-demos-edit");
    routes.add("/history");
  }

  return Array.from(routes);
}

function normalizeAllowedRoutes(value: unknown, fallback: string[]): string[] {
  const fallbackSet = new Set(
    fallback.filter((route) => ALL_ALLOWED_ROUTES.includes(route)),
  );
  if (!Array.isArray(value)) {
    return Array.from(fallbackSet);
  }

  const next = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const route = item.trim();
    if (!route || !ALL_ALLOWED_ROUTES.includes(route)) continue;
    next.add(route);
  }
  if (next.size === 0) {
    return Array.from(fallbackSet);
  }
  return Array.from(next);
}

export function getAllowedRoutesByRole(roleRaw: string | undefined): string[] {
  const role = normalizeText(roleRaw);
  const permissions = loadRolePermissions();
  const configuredRoutes = permissions[role]?.routeAccess?.allowedRoutes;
  if (Array.isArray(configuredRoutes) && configuredRoutes.length > 0) {
    return normalizeAllowedRoutes(
      configuredRoutes,
      getDefaultAllowedRoutesByRole(role),
    );
  }
  return getDefaultAllowedRoutesByRole(role);
}

export function resolveAllowedBuildDemoBrands(account: Account): string[] | null {
  const role = normalizeText(account.role);
  if (role === "admin") return null;

  const userBrands = normalizeBuildDemoBrandIds(account.allowedBuildDemoBrands);
  if (userBrands.length > 0) return userBrands;

  const roleBrands = normalizeBuildDemoBrandIds(
    loadRolePermissions()[role]?.manageDemo?.allowedBuildDemoBrands,
  );
  if (roleBrands.length > 0) return roleBrands;

  return null;
}

function parseAccountBrandOverride(
  value: unknown,
): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = normalizeBuildDemoBrandIds(value);
  return normalized.length > 0 ? normalized : null;
}

export function buildUserPayload(account: Account) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    roleTitle: account.roleTitle,
    status: account.status,
    allowedRoutes: getAllowedRoutesByRole(account.role),
    allowedBuildDemoBrands: resolveAllowedBuildDemoBrands(account),
  };
}

export function buildGuestPayload(email: string, name?: string) {
  const fallbackName = String(name || "").trim() || "Guest";
  const fallbackEmail = String(email || "").trim();
  return {
    id: "guest",
    name: fallbackName,
    email: fallbackEmail,
    phone: "",
    role: "guest",
    roleTitle: "Guest",
    status: "active",
    allowedRoutes: getAllowedRoutesByRole("guest"),
  };
}

export function roleTitleFromRole(roleRaw: string): string {
  const role = normalizeText(roleRaw);
  if (role === "admin") return "Administrator";
  if (role === "manager") return "Manager";
  if (role === "design") return "Design";
  if (role === "guest") return "Guest";
  return "User";
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeRoleOrGuest(value: unknown): string {
  const role = nullableText(value);
  return migrateLegacyRoleKey(role || undefined);
}

export function mapClerkUserToAdminAccount(clerkUser: any, localAccount?: Account) {
  const primaryEmailObj = clerkUser.emailAddresses?.find(
    (email: any) => email.id === clerkUser.primaryEmailAddressId,
  );
  const primaryPhoneObj = clerkUser.phoneNumbers?.find(
    (phone: any) => phone.id === clerkUser.primaryPhoneNumberId,
  );
  const publicMetadata = clerkUser.publicMetadata || {};
  const role = normalizeRoleOrGuest(publicMetadata.role ?? localAccount?.role);
  const roleTitle =
    nullableText(publicMetadata.roleTitle) ||
    nullableText(localAccount?.roleTitle) ||
    roleTitleFromRole(role);
  const status =
    nullableText(publicMetadata.status) ||
    nullableText(localAccount?.status) ||
    "active";

  const clerkBrandOverride = parseAccountBrandOverride(
    publicMetadata.allowedBuildDemoBrands,
  );

  return {
    id: String(clerkUser.id),
    name:
      nullableText(
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" "),
      ) ||
      nullableText(clerkUser.fullName) ||
      nullableText(clerkUser.username),
    email: nullableText(primaryEmailObj?.emailAddress),
    phone: nullableText(primaryPhoneObj?.phoneNumber),
    role,
    roleTitle,
    status,
    allowedRoutes: getAllowedRoutesByRole(role),
    allowedBuildDemoBrands:
      localAccount?.allowedBuildDemoBrands !== undefined
        ? localAccount.allowedBuildDemoBrands
        : clerkBrandOverride ?? null,
  };
}

export function updateLocalAccountById(
  id: string,
  patch: Pick<Account, "allowedBuildDemoBrands">,
) {
  const accounts = loadAccounts();
  const index = accounts.findIndex((account) => account.id === id);
  if (index < 0) return false;
  const nextAccounts = [...accounts];
  nextAccounts[index] = { ...nextAccounts[index], ...patch };
  saveAccounts(nextAccounts);
  return true;
}

export function upsertLocalAccountFromClerkUser(clerkUser: any) {
  const normalized = mapClerkUserToAdminAccount(clerkUser);
  const email = nullableText(normalized.email);
  if (!email) {
    return;
  }

  const accounts = loadAccounts();
  const emailKey = normalizeText(email);
  const existingIndex = accounts.findIndex(
    (account) => normalizeText(account.email) === emailKey,
  );

  const nextAccount: Account = {
    id:
      normalized.id ||
      (existingIndex >= 0 ? accounts[existingIndex].id : `u_${Date.now()}`),
    name:
      normalized.name ||
      (existingIndex >= 0 ? accounts[existingIndex].name : email.split("@")[0]),
    email,
    phone:
      normalized.phone ||
      (existingIndex >= 0 ? accounts[existingIndex].phone : ""),
    role:
      normalized.role ||
      (existingIndex >= 0 ? accounts[existingIndex].role : "guest"),
    roleTitle:
      normalized.roleTitle ||
      (existingIndex >= 0
        ? accounts[existingIndex].roleTitle
        : roleTitleFromRole(normalized.role || "guest")),
    status:
      normalized.status ||
      (existingIndex >= 0 ? accounts[existingIndex].status : "active"),
    allowedBuildDemoBrands:
      existingIndex >= 0
        ? accounts[existingIndex].allowedBuildDemoBrands
        : parseAccountBrandOverride(
            (clerkUser.publicMetadata || {}).allowedBuildDemoBrands,
          ) ?? null,
  };

  if (existingIndex >= 0) {
    const nextAccounts = [...accounts];
    nextAccounts[existingIndex] = nextAccount;
    saveAccounts(nextAccounts);
    return;
  }

  saveAccounts([...accounts, nextAccount]);
}

/** When `creativeShowcase` is absent in stored JSON, keep legacy behaviour (only `media` had no download in UI). */

type ManageDemoPermSlice = NonNullable<
  RolePermissionConfig[string]["manageDemo"]
>;
type SftpAclField = keyof Pick<
  ManageDemoPermSlice,
  | "canSftpUploadBinary"
  | "canSftpWriteFile"
  | "canSftpDelete"
  | "canSftpRename"
  | "canSftpMkdir"
>;

function resolveLegacySftpBundle(
  md: ManageDemoPermSlice | undefined,
): boolean {
  if (md?.canEditDeleteSftp === true) return true;
  if (md?.canEditDeleteSftp === false) return false;
  return md?.canUseFileActionButtons === true;
}

function resolveSftpAclField(
  md: ManageDemoPermSlice | undefined,
  field: SftpAclField,
): boolean {
  const v = md?.[field];
  if (v === true) return true;
  if (v === false) return false;
  return resolveLegacySftpBundle(md);
}

function normalizeCreativeShowcaseDownload(
  config:
    | {
        creativeShowcase?: { canDownload?: boolean };
      }
    | undefined,
  roleRaw: string,
): boolean {
  const raw = config?.creativeShowcase?.canDownload;
  if (raw === true) return true;
  if (raw === false) return false;
  const r = normalizeText(roleRaw);
  return r !== "media";
}

function normalizeRolePermissions(
  input: RolePermissionConfig | null | undefined,
): RolePermissionConfig {
  const safeInput = input || {};
  const normalizedDefault =
    safeInput.default?.manageDemo?.canUseFileActionButtons === true;
  const next: RolePermissionConfig = {
    default: {
      manageDemo: {
        canUseFileActionButtons: normalizedDefault,
        canSwitchSftpHost: false,
        canSetupMediaSftp:
          safeInput.default?.manageDemo?.canSetupMediaSftp === true,
        canSftpUploadBinary: resolveSftpAclField(
          safeInput.default?.manageDemo,
          "canSftpUploadBinary",
        ),
        canSftpWriteFile: resolveSftpAclField(
          safeInput.default?.manageDemo,
          "canSftpWriteFile",
        ),
        canSftpDelete: resolveSftpAclField(
          safeInput.default?.manageDemo,
          "canSftpDelete",
        ),
        canSftpRename: resolveSftpAclField(
          safeInput.default?.manageDemo,
          "canSftpRename",
        ),
        canSftpMkdir: resolveSftpAclField(
          safeInput.default?.manageDemo,
          "canSftpMkdir",
        ),
        allowedBuildDemoBrands: normalizeBuildDemoBrandIds(
          safeInput.default?.manageDemo?.allowedBuildDemoBrands,
        ),
      },
      routeAccess: {
        allowedRoutes: normalizeAllowedRoutes(
          safeInput.default?.routeAccess?.allowedRoutes,
          getDefaultAllowedRoutesByRole("guest"),
        ),
      },
      creativeShowcase: {
        canDownload: normalizeCreativeShowcaseDownload(
          safeInput.default,
          "default",
        ),
      },
    },
  };

  for (const [role, config] of Object.entries(safeInput)) {
    if (!role || role === "default") continue;
    const r = normalizeText(role);
    next[r] = {
      manageDemo: {
        canUseFileActionButtons:
          config?.manageDemo?.canUseFileActionButtons === true,
        canSwitchSftpHost:
          r === "admin"
            ? config?.manageDemo?.canSwitchSftpHost === true
            : false,
        canSetupMediaSftp: config?.manageDemo?.canSetupMediaSftp === true,
        canSftpUploadBinary: resolveSftpAclField(
          config?.manageDemo,
          "canSftpUploadBinary",
        ),
        canSftpWriteFile: resolveSftpAclField(
          config?.manageDemo,
          "canSftpWriteFile",
        ),
        canSftpDelete: resolveSftpAclField(config?.manageDemo, "canSftpDelete"),
        canSftpRename: resolveSftpAclField(config?.manageDemo, "canSftpRename"),
        canSftpMkdir: resolveSftpAclField(config?.manageDemo, "canSftpMkdir"),
        allowedBuildDemoBrands:
          r === "admin"
            ? []
            : normalizeBuildDemoBrandIds(
                config?.manageDemo?.allowedBuildDemoBrands,
              ),
      },
      routeAccess: {
        allowedRoutes: normalizeAllowedRoutes(
          config?.routeAccess?.allowedRoutes,
          getDefaultAllowedRoutesByRole(role),
        ),
      },
      creativeShowcase: {
        canDownload: normalizeCreativeShowcaseDownload(config, role),
      },
    };
  }
  return next;
}

export function loadRolePermissions(): RolePermissionConfig {
  if (!rolePermissionsCache) {
    const raw = fs.readFileSync(rolePermissionsPath, "utf8");
    const parsed = JSON.parse(raw) as RolePermissionConfig;
    rolePermissionsCache = normalizeRolePermissions(
      migrateRolePermissionSlugKeys(parsed),
    );
  }
  return rolePermissionsCache;
}

export function saveRolePermissions(permissions: RolePermissionConfig) {
  const normalized = normalizeRolePermissions(permissions);
  rolePermissionsCache = normalized;
  fs.writeFileSync(
    rolePermissionsPath,
    JSON.stringify(normalized, null, 2),
    "utf8",
  );
}

export function getPermissionsSnapshot() {
  return {
    permissions: loadRolePermissions(),
    availableRoutes: ALL_ALLOWED_ROUTES,
    buildDemoBrandOptions: getBuildDemoBrandOptions(),
  };
}

type RolePermissionUpdatePayload = {
  manageDemo?: {
    canUseFileActionButtons?: unknown;
    canSwitchSftpHost?: unknown;
    canSetupMediaSftp?: unknown;
    canSftpUploadBinary?: unknown;
    canSftpWriteFile?: unknown;
    canSftpDelete?: unknown;
    canSftpRename?: unknown;
    canSftpMkdir?: unknown;
    allowedBuildDemoBrands?: unknown;
  };
  routeAccess?: { allowedRoutes?: unknown };
  creativeShowcase?: { canDownload?: unknown };
};

export function updateRolePermission(
  roleRaw: string,
  payload: RolePermissionUpdatePayload,
) {
  const role = normalizeText(roleRaw);
  if (!role) {
    throw new Error("Missing role");
  }

  const allowedBuildDemoBrands =
    role === "admin"
      ? []
      : normalizeBuildDemoBrandIds(payload?.manageDemo?.allowedBuildDemoBrands);
  const canUseFileActionButtons =
    payload?.manageDemo?.canUseFileActionButtons === true;
  const canSwitchSftpHost =
    role === "admin" && payload?.manageDemo?.canSwitchSftpHost === true;
  const canSetupMediaSftp = payload?.manageDemo?.canSetupMediaSftp === true;
  const md = payload?.manageDemo;
  const canSftpUploadBinary = md?.canSftpUploadBinary === true;
  const canSftpWriteFile = md?.canSftpWriteFile === true;
  const canSftpDelete = md?.canSftpDelete === true;
  const canSftpRename = md?.canSftpRename === true;
  const canSftpMkdir = md?.canSftpMkdir === true;
  const allowedRoutes = normalizeAllowedRoutes(
    payload?.routeAccess?.allowedRoutes,
    getDefaultAllowedRoutesByRole(role),
  );

  const currentPermissions = loadRolePermissions();
  const existingCreativeDownload =
    currentPermissions[role]?.creativeShowcase?.canDownload === true;
  const canDownloadCreativeDemos =
    typeof payload?.creativeShowcase?.canDownload === "boolean"
      ? payload.creativeShowcase.canDownload === true
      : existingCreativeDownload;

  const nextPermissions: RolePermissionConfig = {
    ...currentPermissions,
    [role]: {
      ...(currentPermissions[role] || {}),
      manageDemo: {
        ...currentPermissions[role]?.manageDemo,
        canUseFileActionButtons,
        canSwitchSftpHost,
        canSetupMediaSftp,
        canSftpUploadBinary,
        canSftpWriteFile,
        canSftpDelete,
        canSftpRename,
        canSftpMkdir,
        allowedBuildDemoBrands,
      },
      routeAccess: {
        ...currentPermissions[role]?.routeAccess,
        allowedRoutes,
      },
      creativeShowcase: {
        ...currentPermissions[role]?.creativeShowcase,
        canDownload: canDownloadCreativeDemos,
      },
    },
  };
  saveRolePermissions(nextPermissions);
  return {
    role,
    permission: nextPermissions[role],
    permissions: nextPermissions,
  };
}
