import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClerkClient } from "@clerk/backend";
import { sftpRouter } from "./routes/sftp.js";
import { ragRouter } from "./routes/rag.js";
import { uploadRouter } from "./routes/upload.js";
import { fileUploadRouter } from "./routes/fileUpload.js";
import { testDataRouter } from "./routes/testData.js";
import { userRouter } from "./routes/user.js";
import { errorHandler, notFoundHandler } from "./lib/http/errors.js";
import { getUserRole } from "./lib/auth/role.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

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
app.use(express.json({ limit: "50mb" }));

app.use("/api/sftp", sftpRouter);
app.use("/api/rag", ragRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/file-upload", fileUploadRouter);
app.use("/api/test-data", testDataRouter);
app.use("/api/user", userRouter);

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
};

type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
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
  "/creative-showcase",
  "/document",
  "/documentation",
  "/manage-demo",
  "/bar",
  "/cinema",
  "/live",
  "/history",
  "/ai-gmail",
];

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getAllowedRoutesByRole(roleRaw: string | undefined): string[] {
  const role = normalizeText(roleRaw);
  const routes = new Set(BASE_ALLOWED_ROUTES);

  if (role !== "guest") {
    routes.add("/test-data");
  }
  if (role === "admin" || role === "design") {
    routes.add("/build-demo");
    routes.add("/upload");
  }
  if (role === "admin") {
    routes.add("/manage-sftp");
    routes.add("/admin/users");
  }

  return Array.from(routes);
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
  if (role === "adsopmanager") return "AdsOp Manager";
  if (role === "adsop") return "AdsOp";
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
  return role ? role.toLowerCase() : "guest";
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
  };

  if (existingIndex >= 0) {
    const nextAccounts = [...accounts];
    nextAccounts[existingIndex] = nextAccount;
    saveAccounts(nextAccounts);
    return;
  }

  saveAccounts([...accounts, nextAccount]);
}

function loadCreativeDemos() {
  const raw = fs.readFileSync(creativeDemosPath, "utf8");
  const parsed = JSON.parse(raw) as { demos?: any[] };
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
      },
    },
  };

  for (const [role, config] of Object.entries(safeInput)) {
    if (!role || role === "default") continue;
    next[normalizeText(role)] = {
      manageDemo: {
        canUseFileActionButtons:
          config?.manageDemo?.canUseFileActionButtons === true,
      },
    };
  }
  return next;
}

function loadRolePermissions(): RolePermissionConfig {
  if (!rolePermissionsCache) {
    const raw = fs.readFileSync(rolePermissionsPath, "utf8");
    const parsed = JSON.parse(raw) as RolePermissionConfig;
    rolePermissionsCache = normalizeRolePermissions(parsed);
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
    const secretKey = process.env.CLERK_SECRET_KEY;
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
    return res
      .status(500)
      .json({ ok: false, error: "Unable to fetch users from Clerk" });
  }
});

app.get("/api/permissions", (_req, res) => {
  return res.json({ ok: true, permissions: loadRolePermissions() });
});

app.get("/api/admin/permissions", (req, res) => {
  if (!ensureAdmin(req, res)) return;
  return res.json({ ok: true, permissions: loadRolePermissions() });
});

app.put("/api/admin/permissions/:role", (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const role = normalizeText(String(req.params.role || ""));
  if (!role) {
    return res.status(400).json({ ok: false, error: "Missing role" });
  }

  const payload = req.body as {
    manageDemo?: { canUseFileActionButtons?: unknown };
  };
  const canUseFileActionButtons =
    payload?.manageDemo?.canUseFileActionButtons === true;

  const currentPermissions = loadRolePermissions();
  const nextPermissions: RolePermissionConfig = {
    ...currentPermissions,
    [role]: {
      ...(currentPermissions[role] || {}),
      manageDemo: {
        ...currentPermissions[role]?.manageDemo,
        canUseFileActionButtons,
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

  if (!updates.role && !updates.roleTitle && !updates.status) {
    return res.status(400).json({ ok: false, error: "No valid update fields" });
  }
  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
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

    const updatedUser = await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: nextPublicMetadata,
    });

    upsertLocalAccountFromClerkUser(updatedUser);

    return res.json({
      ok: true,
      user: mapClerkUserToAdminAccount(updatedUser),
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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
