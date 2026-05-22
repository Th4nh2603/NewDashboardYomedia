import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import net from "node:net";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "url";
import { createClerkClient } from "@clerk/backend";
import { sftpRouter } from "./routes/sftp.js";
import { ragRouter } from "./routes/rag.js";
import { uploadRouter } from "./routes/upload.js";
import { fileUploadRouter } from "./routes/fileUpload.js";
import { activityLogRouter } from "./routes/activityLog.js";
import { testDataRouter } from "./routes/testData.js";
import { userRouter } from "./routes/user.js";
import { smtpRouter, legacySendEmailHandler } from "./routes/smtp.js";
import { errorHandler, notFoundHandler } from "./lib/http/errors.js";
import { getUserRole } from "./lib/auth/role.js";
import {
  getBuildDemoBrandOptions,
  normalizeBuildDemoBrandIds,
} from "./lib/buildDemoBrands.js";

function getClerkApiFirstErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const errors = (error as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0];
  if (typeof first !== "object" || first === null) return undefined;
  const msg = (first as { message?: unknown }).message;
  return msg == null ? undefined : String(msg);
}

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3001;

function findAvailablePort(
  startPort: number,
  host: string,
  maxAttempts = 30,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryPort = () => {
      if (port >= startPort + maxAttempts) {
        reject(
          new Error(
            `No free TCP port found between ${startPort} and ${startPort + maxAttempts - 1} on ${host}`,
          ),
        );
        return;
      }
      const tester = net.createServer();
      tester.once("error", (err: NodeJS.ErrnoException) => {
        tester.close();
        if (err.code === "EADDRINUSE") {
          console.warn(`Port ${port} in use, trying ${port + 1}…`);
          port += 1;
          tryPort();
        } else {
          reject(err);
        }
      });
      tester.listen(port, host, () => {
        tester.close(() => resolve(port));
      });
    };
    tryPort();
  });
}

function writeDevApiPortFile(port: number) {
  if (process.env.NODE_ENV === "production") return;
  try {
    const webApiPortFile = path.join(
      __dirname,
      "..",
      "..",
      "web",
      ".dev-api-port",
    );
    fs.writeFileSync(webApiPortFile, String(port), "utf8");
  } catch (e) {
    console.warn("Could not write apps/web/.dev-api-port (Vite API proxy):", e);
  }
}

app.use(
  cors({
    origin: (
      origin: string | undefined,
      cb: (err: null, allow: boolean | string) => void,
    ) => cb(null, origin || true),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-role"],
  }),
);
/** Large enough for bulky JSON; video uploads prefer /api/sftp/write-binary (octet-stream, 500mb). */
app.use(express.json({ limit: "500mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/sftp", sftpRouter);
app.use("/api/rag", ragRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/file-upload", fileUploadRouter);
app.use("/api/activity-log", activityLogRouter);
app.use("/api/test-data", testDataRouter);
app.use("/api/user", userRouter);
app.use("/api/smtp", smtpRouter);
app.post("/api/send-email", legacySendEmailHandler);

// Simple JSON-file-based data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const accountsPath = path.join(__dirname, "data", "accounts.json");
const creativeDemosPath = path.join(__dirname, "data", "creative-demos.json");
const rolePermissionsPath = path.join(
  __dirname,
  "data",
  "role-permissions.json",
);

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
  roleTitle?: string;
  status?: string;
  /** Non-empty = user override; omit/null = inherit role default. */
  allowedBuildDemoBrands?: string[] | null;
};

type RolePermissionConfig = Record<
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

let accountsCache: Account[] | null = null;
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
const ALL_ALLOWED_ROUTES = Array.from(
  new Set([
    ...BASE_ALLOWED_ROUTES,
    ...NON_GUEST_EXTRA_ROUTES,
    ...DESIGN_EXTRA_ROUTES,
    ...ADMIN_EXTRA_ROUTES,
  ]),
);

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** Renamed slug: `adsopmanager` → `manager` (backward compat). */
function migrateLegacyRoleKey(roleRaw: string | undefined): string {
  const r = normalizeText(roleRaw);
  if (!r) return "guest";
  return r === "adsopmanager" ? "manager" : r;
}

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

function getDefaultAllowedRoutesByRole(roleRaw: string | undefined): string[] {
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

function getAllowedRoutesByRole(roleRaw: string | undefined): string[] {
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

function resolveAllowedBuildDemoBrands(account: Account): string[] | null {
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

function buildUserPayload(account: Account) {
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

function buildGuestPayload(email: string, name?: string) {
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

function roleTitleFromRole(roleRaw: string): string {
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

function normalizeRoleOrGuest(value: unknown): string {
  const role = nullableText(value);
  return migrateLegacyRoleKey(role || undefined);
}

function mapClerkUserToAdminAccount(clerkUser: any, localAccount?: Account) {
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

function loadAccounts(): Account[] {
  if (!accountsCache) {
    const raw = fs.readFileSync(accountsPath, "utf8");
    const parsed = JSON.parse(raw) as { accounts: Account[] };
    accountsCache = parsed.accounts || [];
  }
  return accountsCache;
}

function saveAccounts(accounts: Account[]) {
  accountsCache = accounts;
  fs.writeFileSync(accountsPath, JSON.stringify({ accounts }, null, 2), "utf8");
}

function updateLocalAccountById(
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

function upsertLocalAccountFromClerkUser(clerkUser: any) {
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

function loadCreativeDemos() {
  const raw = fs.readFileSync(creativeDemosPath, "utf8");
  // Guard against UTF-8 BOM so JSON.parse does not crash and break /api/creative-demos.
  const safeRaw = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const parsed = JSON.parse(safeRaw) as { demos?: any[] };
  return parsed.demos || [];
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

function loadRolePermissions(): RolePermissionConfig {
  if (!rolePermissionsCache) {
    const raw = fs.readFileSync(rolePermissionsPath, "utf8");
    const parsed = JSON.parse(raw) as RolePermissionConfig;
    rolePermissionsCache = normalizeRolePermissions(
      migrateRolePermissionSlugKeys(parsed),
    );
  }
  return rolePermissionsCache;
}

function saveRolePermissions(permissions: RolePermissionConfig) {
  const normalized = normalizeRolePermissions(permissions);
  rolePermissionsCache = normalized;
  fs.writeFileSync(
    rolePermissionsPath,
    JSON.stringify(normalized, null, 2),
    "utf8",
  );
}

function ensureAdmin(req: express.Request, res: express.Response): boolean {
  const role = getUserRole(req);
  if (role !== "admin") {
    res
      .status(403)
      .json({ ok: false, error: "Forbidden: admin role required" });
    return false;
  }
  return true;
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing email or password" });
  }

  const accounts = loadAccounts();
  // Normalize phone/password by removing spaces so formatting differences don't block login
  const normalizePhone = (value: string | undefined) =>
    (value || "").replace(/\s+/g, "");

  const account = accounts.find(
    (a) =>
      normalizeText(a.email) === normalizeText(email) &&
      normalizePhone(a.phone) === normalizePhone(password),
  );

  if (!account) {
    return res
      .status(401)
      .json({ ok: false, error: "Invalid email or password" });
  }

  return res.json({
    ok: true,
    user: buildUserPayload(account),
  });
});

app.post("/api/auth/me", (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string };
  const emailNorm = normalizeText(email);
  const nameNorm = normalizeText(name);

  if (!emailNorm) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  const account = loadAccounts().find(
    (item) => normalizeText(item.email) === emailNorm,
  );

  if (!account) {
    return res.json({
      ok: true,
      nameMatched: false,
      user: buildGuestPayload(email || emailNorm, name),
      isGuest: true,
    });
  }

  const nameMatched = !nameNorm || normalizeText(account.name) === nameNorm;

  return res.json({
    ok: true,
    nameMatched,
    user: buildUserPayload(account),
  });
});

app.post("/api/auth/role-routes", (req, res) => {
  const { email, name } = req.body as { email?: string; name?: string };
  const emailNorm = normalizeText(email);
  const nameNorm = normalizeText(name);
  if (!emailNorm) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  const account = loadAccounts().find(
    (item) => normalizeText(item.email) === emailNorm,
  );

  if (!account) {
    return res.json({
      ok: true,
      nameMatched: false,
      user: buildGuestPayload(email || emailNorm, name),
      isGuest: true,
    });
  }

  const nameMatched = !nameNorm || normalizeText(account.name) === nameNorm;

  return res.json({
    ok: true,
    nameMatched,
    user: buildUserPayload(account),
  });
});

app.get("/api/account-profile", (req, res) => {
  const email = String(req.query.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  const account = loadAccounts().find(
    (item) =>
      String(item.email || "")
        .trim()
        .toLowerCase() === email,
  );

  if (!account) {
    return res.status(404).json({ ok: false, error: "Account not found" });
  }

  return res.json({
    ok: true,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      roleTitle: account.roleTitle,
      status: account.status,
    },
  });
});

app.get("/api/admin/accounts", async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const secretKey = process.env.CLERK_SECRET_KEY?.trim();
    if (!secretKey) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing CLERK_SECRET_KEY on server" });
    }

    const clerkClient = createClerkClient({ secretKey });
    const response = await clerkClient.users.getUserList({ limit: 500 });
    const users = Array.isArray((response as any).data)
      ? (response as any).data
      : Array.isArray(response)
        ? response
        : [];

    const localAccountsByEmail = new Map(
      loadAccounts().map((account) => [normalizeText(account.email), account]),
    );

    return res.json({
      ok: true,
      accounts: users.map((clerkUser: any) => {
        const primaryEmailObj = clerkUser.emailAddresses?.find(
          (email: any) => email.id === clerkUser.primaryEmailAddressId,
        );
        const emailKey = normalizeText(primaryEmailObj?.emailAddress);
        const localAccount = localAccountsByEmail.get(emailKey);
        return mapClerkUserToAdminAccount(clerkUser, localAccount);
      }),
    });
  } catch (error) {
    console.error("Failed to fetch admin accounts from Clerk", error);
    const clerkMsg =
      getClerkApiFirstErrorMessage(error) ||
      (error instanceof Error ? error.message : "");
    return res.status(500).json({
      ok: false,
      error: clerkMsg
        ? `Unable to fetch users from Clerk (${clerkMsg})`
        : "Unable to fetch users from Clerk",
    });
  }
});

app.get("/api/permissions", (_req, res) => {
  return res.json({
    ok: true,
    permissions: loadRolePermissions(),
    availableRoutes: ALL_ALLOWED_ROUTES,
    buildDemoBrandOptions: getBuildDemoBrandOptions(),
  });
});

app.get("/api/admin/permissions", (req, res) => {
  if (!ensureAdmin(req, res)) return;
  return res.json({
    ok: true,
    permissions: loadRolePermissions(),
    availableRoutes: ALL_ALLOWED_ROUTES,
    buildDemoBrandOptions: getBuildDemoBrandOptions(),
  });
});

app.put("/api/admin/permissions/:role", (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const role = normalizeText(String(req.params.role || ""));
  if (!role) {
    return res.status(400).json({ ok: false, error: "Missing role" });
  }

  const payload = req.body as {
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
  return res.json({
    ok: true,
    role,
    permission: nextPermissions[role],
    permissions: nextPermissions,
  });
});

app.put("/api/admin/accounts/:id", async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const id = String(req.params.id || "").trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing account id" });
  }

  const payload = req.body as {
    role?: string;
    roleTitle?: string;
    status?: string;
    allowedBuildDemoBrands?: unknown;
  };
  const updates: Partial<Account> = {};

  if (typeof payload.role === "string") {
    updates.role = payload.role.trim().toLowerCase();
  }
  if (typeof payload.roleTitle === "string") {
    updates.roleTitle = payload.roleTitle.trim();
  }
  if (typeof payload.status === "string") {
    updates.status = payload.status.trim().toLowerCase();
  }
  if (payload.allowedBuildDemoBrands !== undefined) {
    const existing = loadAccounts().find((account) => account.id === id);
    const effectiveRole = normalizeText(updates.role ?? existing?.role);
    if (effectiveRole === "admin") {
      updates.allowedBuildDemoBrands = null;
    } else {
      const normalized = normalizeBuildDemoBrandIds(
        payload.allowedBuildDemoBrands,
      );
      updates.allowedBuildDemoBrands =
        normalized.length > 0 ? normalized : null;
    }
  }

  if (
    !updates.role &&
    !updates.roleTitle &&
    !updates.status &&
    updates.allowedBuildDemoBrands === undefined
  ) {
    return res.status(400).json({ ok: false, error: "No valid update fields" });
  }
  try {
    const secretKey = process.env.CLERK_SECRET_KEY?.trim();
    if (!secretKey) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing CLERK_SECRET_KEY on server" });
    }

    const clerkClient = createClerkClient({ secretKey });
    const currentUser = await clerkClient.users.getUser(id);
    const currentMetadata = (currentUser.publicMetadata || {}) as Record<
      string,
      unknown
    >;

    const nextPublicMetadata: Record<string, unknown> = {
      ...currentMetadata,
    };
    if (updates.role) {
      nextPublicMetadata.role = updates.role;
    }
    if (updates.roleTitle) {
      nextPublicMetadata.roleTitle = updates.roleTitle;
    } else if (updates.role) {
      nextPublicMetadata.roleTitle = roleTitleFromRole(updates.role);
    }
    if (updates.status) {
      nextPublicMetadata.status = updates.status;
    }
    if (updates.allowedBuildDemoBrands !== undefined) {
      nextPublicMetadata.allowedBuildDemoBrands = updates.allowedBuildDemoBrands;
    }

    const updatedUser = await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: nextPublicMetadata,
    });

    upsertLocalAccountFromClerkUser(updatedUser);
    if (updates.allowedBuildDemoBrands !== undefined) {
      updateLocalAccountById(id, {
        allowedBuildDemoBrands: updates.allowedBuildDemoBrands,
      });
    }

    const localAccounts = loadAccounts();
    const localAccount = localAccounts.find((account) => account.id === id);

    return res.json({
      ok: true,
      user: mapClerkUserToAdminAccount(updatedUser, localAccount),
    });
  } catch (error) {
    console.error(`Failed to update Clerk user ${id}`, error);
    return res.status(500).json({ ok: false, error: "Unable to update user" });
  }
});

app.get("/api/creative-demos", (_req, res) => {
  const demos = loadCreativeDemos().filter(
    (d) => String(d?.status ?? "").toLowerCase() === "active",
  );
  return res.json({ ok: true, demos });
});

app.get("/api/creative-demo-titles", (req, res) => {
  const activeOnlyRaw = String(req.query.activeOnly ?? "").toLowerCase();
  const activeOnly =
    activeOnlyRaw === "1" ||
    activeOnlyRaw === "true" ||
    activeOnlyRaw === "yes";
  let demos = loadCreativeDemos();
  if (activeOnly) {
    demos = demos.filter(
      (d) => String(d?.status ?? "").toLowerCase() === "active",
    );
  }
  const items = demos
    .map((d) => ({
      id: String(d?.id ?? "").trim(),
      title: typeof d?.title === "string" ? d.title.trim() : "",
      category: typeof d?.category === "string" ? d.category.trim() : "",
      value: typeof d?.value === "string" ? d.value.trim() : "",
      fileType:
        typeof d?.fileType === "string" ? d.fileType.trim() : "",
      size: Array.isArray(d?.size)
        ? d.size.map((s: unknown) => String(s ?? "").trim()).filter(Boolean)
        : typeof d?.size === "string"
          ? d.size.trim()
          : "",
      fla: d?.fla === true,
    }))
    .filter((item) => item.id && item.title);
  return res.json({ ok: true, items });
});

app.use(notFoundHandler);
app.use(errorHandler);

const LISTEN_HOST = process.env.LISTEN_HOST || "0.0.0.0";

findAvailablePort(BASE_PORT, LISTEN_HOST)
  .then((port) => {
    if (port !== BASE_PORT) {
      console.warn(
        `API bound to ${port} (PORT ${BASE_PORT} was in use). Vite dev reads apps/web/.dev-api-port for /api proxy.`,
      );
    }
    const server = createHttpServer(app);
    server.listen(port, LISTEN_HOST, () => {
      writeDevApiPortFile(port);
      console.log(
        `Server listening on http://${LISTEN_HOST === "0.0.0.0" ? "localhost" : LISTEN_HOST}:${port}`,
      );
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
