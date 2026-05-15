import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import Button from "../components/Button";

type Account = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roleTitle: string | null;
  status: string | null;
};

type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
      canSwitchSftpHost?: boolean;
      canSetupMediaSftp?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
      canSftpRename?: boolean;
      canSftpMkdir?: boolean;
    };
    routeAccess?: {
      allowedRoutes?: string[];
    };
    creativeShowcase?: {
      canDownload?: boolean;
    };
  }
>;

type AdminTab = "users" | "permissions";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "design", label: "Design" },
  { value: "media", label: "Media" },
  { value: "guest", label: "Guest" },
];

/** <Route path="…"> in apps/web/App.tsx; HashRouter exposes them as `#/…` in the browser URL. */
const WEB_MANAGE_DEMO = "/manage-demo";
const WEB_BUILD_DEMO = "/build-demo";
const WEB_MANAGE_SFTP = "/manage-sftp";
const WEB_CREATIVE = "/creative";
const WEB_BUILD_DEMO_SETUP = "/build-demo";

const SFTP_ACL_FIELDS: {
  key:
    | "canSftpUploadBinary"
    | "canSftpWriteFile"
    | "canSftpDelete"
    | "canSftpRename"
    | "canSftpMkdir";
  title: string;
  detail?: string;
  paths: readonly string[];
}[] = [
  {
    key: "canSftpUploadBinary",
    title: "Upload binary",
    paths: [WEB_MANAGE_DEMO, WEB_BUILD_DEMO],
  },
  {
    key: "canSftpWriteFile",
    title: "Write file",
    detail: "Text + base64",
    paths: [WEB_MANAGE_DEMO, WEB_BUILD_DEMO, WEB_MANAGE_SFTP],
  },
  {
    key: "canSftpDelete",
    title: "Delete path",
    paths: [WEB_MANAGE_DEMO, WEB_MANAGE_SFTP],
  },
  {
    key: "canSftpRename",
    title: "Rename path",
    paths: [WEB_MANAGE_DEMO],
  },
  {
    key: "canSftpMkdir",
    title: "Create directory",
    paths: [WEB_MANAGE_DEMO],
  },
];

const WebRouteChips: React.FC<{ paths: readonly string[] }> = ({ paths }) => (
  <span className="flex flex-wrap gap-1">
    {paths.map((p) => (
      <span
        key={p}
        className="inline-flex rounded-md border border-[#4cceac]/30 bg-[#4cceac]/10 px-1.5 py-0.5 font-mono text-[11px] leading-none text-emerald-700 dark:border-[#4cceac]/25 dark:bg-[#4cceac]/[0.08] dark:text-[#a7f3d0]"
        title="React route (HashRouter: # + this path)"
      >
        {p}
      </span>
    ))}
  </span>
);

type PermissionCheckboxRowProps = {
  checked: boolean;
  onChecked: (checked: boolean) => void;
  title: React.ReactNode;
  paths?: readonly string[];
  subtitle?: React.ReactNode;
};

const PermissionCheckboxRow: React.FC<PermissionCheckboxRowProps> = ({
  checked,
  onChecked,
  title,
  paths,
  subtitle,
}) => (
  <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.07] dark:bg-[#0d111a]/90 dark:hover:border-white/12 dark:hover:bg-[#0d111a]">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChecked(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 accent-[#4cceac]"
    />
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-[13px] font-medium leading-snug text-slate-800 dark:text-[#e2e8f0]">
        {title}
      </span>
      {subtitle ? (
        <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-500">
          {subtitle}
        </span>
      ) : null}
      {paths && paths.length > 0 ? (
        <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Paths
          </span>
          <WebRouteChips paths={paths} />
        </span>
      ) : null}
    </span>
  </label>
);

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const roleTitleFromRole = (role: string) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.label || "User";

const normalizeNullableField = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRole = (role: unknown): string => {
  const normalized = normalizeNullableField(role)?.toLowerCase();
  return normalized || "guest";
};

const normalizeAccount = (account: Partial<Account>, index: number): Account => ({
  id: normalizeNullableField(account.id) || `unknown-${index}`,
  name: normalizeNullableField(account.name),
  email: normalizeNullableField(account.email),
  phone: normalizeNullableField(account.phone),
  role: normalizeRole(account.role),
  roleTitle: normalizeNullableField(account.roleTitle),
  status: normalizeNullableField(account.status),
});

const normalizeRoutes = (routes: unknown): string[] => {
  if (!Array.isArray(routes)) return [];
  return Array.from(
    new Set(
      routes
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).sort();
};

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const roleHeader = (user?.role || "").toLowerCase();
  const baseUrl = serverApiOrigin();
  const [activeTab, setActiveTab] = React.useState<AdminTab>("users");

  const [items, setItems] = React.useState<Account[]>([]);
  const [initialItems, setInitialItems] = React.useState<Account[]>([]);
  const [permissions, setPermissions] = React.useState<RolePermissionConfig>({});
  const [initialPermissions, setInitialPermissions] =
    React.useState<RolePermissionConfig>({});
  const [availableRoutes, setAvailableRoutes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [permissionsLoading, setPermissionsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [savingPermissionRole, setSavingPermissionRole] = React.useState<
    string | null
  >(null);

  const loadAccounts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        accounts?: Array<Partial<Account>>;
      }>(
        `${baseUrl}/api/admin/accounts`,
        {
          headers: { "x-user-role": roleHeader },
        },
      );
      const normalizedAccounts = Array.isArray(data.accounts)
        ? data.accounts.map((account, index) => normalizeAccount(account, index))
        : [];
      setItems(normalizedAccounts);
      setInitialItems(normalizedAccounts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load account list",
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, roleHeader]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const loadPermissions = React.useCallback(async () => {
    setPermissionsLoading(true);
    setError(null);
    try {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        permissions?: RolePermissionConfig;
        availableRoutes?: string[];
      }>(`${baseUrl}/api/admin/permissions`, {
        headers: { "x-user-role": roleHeader },
      });
      setPermissions(data.permissions || {});
      setInitialPermissions(data.permissions || {});
      setAvailableRoutes(
        Array.isArray(data.availableRoutes) ? data.availableRoutes : [],
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load role permissions",
      );
    } finally {
      setPermissionsLoading(false);
    }
  }, [baseUrl, roleHeader]);

  React.useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const updateItem = (
    id: string,
    field: "role" | "roleTitle" | "status",
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleSave = async (item: Account) => {
    setSavingId(item.id);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        role: normalizeRole(item.role),
        roleTitle:
          String(item.roleTitle || "").trim() ||
          roleTitleFromRole(normalizeRole(item.role)),
        status: String(item.status || "active")
          .trim()
          .toLowerCase(),
      };
      await fetchJsonOrThrow(`${baseUrl}/api/admin/accounts/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": roleHeader,
        },
        body: JSON.stringify(payload),
      });
      setInitialItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...item } : entry)),
      );
      setMessage(`Updated user ${item.name || item.email || item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user");
    } finally {
      setSavingId(null);
    }
  };

  const updatePermission = (role: string, canUse: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        manageDemo: {
          ...(prev[role]?.manageDemo || {}),
          canUseFileActionButtons: canUse,
        },
      },
    }));
  };

  const updateCanSwitchSftpHost = (role: string, enabled: boolean) => {
    if (role !== "admin") return;
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        manageDemo: {
          ...(prev[role]?.manageDemo || {}),
          canSwitchSftpHost: enabled,
        },
      },
    }));
  };

  const updateCanSetupMediaSftp = (role: string, enabled: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        manageDemo: {
          ...(prev[role]?.manageDemo || {}),
          canSetupMediaSftp: enabled,
        },
      },
    }));
  };

  const updateSftpAcl = (
    role: string,
    field: (typeof SFTP_ACL_FIELDS)[number]["key"],
    enabled: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        manageDemo: {
          ...(prev[role]?.manageDemo || {}),
          [field]: enabled,
        },
      },
    }));
  };

  const updatePermissionRoutes = (role: string, routes: string[]) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        routeAccess: {
          ...(prev[role]?.routeAccess || {}),
          allowedRoutes: routes,
        },
      },
    }));
  };

  const updateCreativeShowcaseDownload = (role: string, enabled: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        creativeShowcase: {
          ...(prev[role]?.creativeShowcase || {}),
          canDownload: enabled,
        },
      },
    }));
  };

  const handleSavePermission = async (role: string) => {
    setSavingPermissionRole(role);
    setError(null);
    setMessage(null);
    try {
      const canUseFileActionButtons =
        permissions[role]?.manageDemo?.canUseFileActionButtons === true;
      const allowedRoutes = Array.isArray(
        permissions[role]?.routeAccess?.allowedRoutes,
      )
        ? permissions[role]?.routeAccess?.allowedRoutes
        : [];
      const canSwitchSftpHost =
        role === "admin" &&
        permissions[role]?.manageDemo?.canSwitchSftpHost === true;
      const canSetupMediaSftp =
        permissions[role]?.manageDemo?.canSetupMediaSftp === true;
      const canSftpUploadBinary =
        permissions[role]?.manageDemo?.canSftpUploadBinary === true;
      const canSftpWriteFile =
        permissions[role]?.manageDemo?.canSftpWriteFile === true;
      const canSftpDelete =
        permissions[role]?.manageDemo?.canSftpDelete === true;
      const canSftpRename =
        permissions[role]?.manageDemo?.canSftpRename === true;
      const canSftpMkdir =
        permissions[role]?.manageDemo?.canSftpMkdir === true;
      const canDownloadCreativeDemos =
        permissions[role]?.creativeShowcase?.canDownload === true;
      await fetchJsonOrThrow(`${baseUrl}/api/admin/permissions/${role}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": roleHeader,
        },
        body: JSON.stringify({
          manageDemo: {
            canUseFileActionButtons,
            canSwitchSftpHost:
              role === "admin"
                ? canSwitchSftpHost
                : false,
            canSetupMediaSftp,
            canSftpUploadBinary,
            canSftpWriteFile,
            canSftpDelete,
            canSftpRename,
            canSftpMkdir,
          },
          routeAccess: {
            allowedRoutes,
          },
          creativeShowcase: {
            canDownload: canDownloadCreativeDemos,
          },
        }),
      });
      setInitialPermissions((prev) => ({
        ...prev,
        [role]: {
          ...(permissions[role] || {}),
          routeAccess: {
            ...(permissions[role]?.routeAccess || {}),
            allowedRoutes: normalizeRoutes(
              permissions[role]?.routeAccess?.allowedRoutes,
            ),
          },
          creativeShowcase: {
            canDownload: canDownloadCreativeDemos,
          },
        },
      }));
      setMessage(`Updated permission for role: ${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update permission");
    } finally {
      setSavingPermissionRole(null);
    }
  };

  const isUserDirty = (item: Account): boolean => {
    const original = initialItems.find((entry) => entry.id === item.id);
    if (!original) return false;
    return (
      normalizeRole(item.role) !== normalizeRole(original.role) ||
      String(item.roleTitle || "").trim() !== String(original.roleTitle || "").trim() ||
      String(item.status || "active").trim().toLowerCase() !==
        String(original.status || "active").trim().toLowerCase()
    );
  };

  const isPermissionDirty = (role: string): boolean => {
    const currentCanUse =
      permissions[role]?.manageDemo?.canUseFileActionButtons === true;
    const originalCanUse =
      initialPermissions[role]?.manageDemo?.canUseFileActionButtons === true;
    const currentSwitch =
      role === "admin" &&
      permissions[role]?.manageDemo?.canSwitchSftpHost === true;
    const originalSwitch =
      role === "admin" &&
      initialPermissions[role]?.manageDemo?.canSwitchSftpHost === true;
    const currentSetupMedia =
      permissions[role]?.manageDemo?.canSetupMediaSftp === true;
    const originalSetupMedia =
      initialPermissions[role]?.manageDemo?.canSetupMediaSftp === true;
    const md = permissions[role]?.manageDemo;
    const imd = initialPermissions[role]?.manageDemo;
    const sftpDirty = SFTP_ACL_FIELDS.some(
      (f) =>
        (md?.[f.key] === true) !== (imd?.[f.key] === true),
    );
    const currentCreativeDownload =
      permissions[role]?.creativeShowcase?.canDownload === true;
    const originalCreativeDownload =
      initialPermissions[role]?.creativeShowcase?.canDownload === true;
    const currentRoutes = normalizeRoutes(
      permissions[role]?.routeAccess?.allowedRoutes,
    );
    const originalRoutes = normalizeRoutes(
      initialPermissions[role]?.routeAccess?.allowedRoutes,
    );
    return (
      currentCanUse !== originalCanUse ||
      currentSwitch !== originalSwitch ||
      currentSetupMedia !== originalSetupMedia ||
      sftpDirty ||
      currentCreativeDownload !== originalCreativeDownload ||
      JSON.stringify(currentRoutes) !== JSON.stringify(originalRoutes)
    );
  };

  return (
    <div className="w-full px-8 pt-10 pb-16 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic dark:text-white">
            User & Permission Management
          </h1>
          <p className="text-xs text-slate-600 mt-1 dark:text-[#a3a3a3]">
            Separate user management from role-based permission configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              if (activeTab === "users") void loadAccounts();
              if (activeTab === "permissions") void loadPermissions();
            }}
            disabled={loading || permissionsLoading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:text-white/90 dark:bg-white/5 dark:hover:bg-white/10"
          >
            Reload
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
            activeTab === "users"
              ? "border-[#4cceac] bg-[#4cceac]/15 text-emerald-700 dark:bg-[#4cceac]/20 dark:text-[#9ff3de]"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          }`}
        >
          Users
        </Button>
        <Button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
            activeTab === "permissions"
              ? "border-[#4cceac] bg-[#4cceac]/15 text-emerald-700 dark:bg-[#4cceac]/20 dark:text-[#9ff3de]"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          }`}
        >
          Permissions
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          {message}
        </div>
      )}

      {activeTab === "users" ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-white/5 dark:bg-[#141b2d] dark:shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-[#0d111a] dark:text-[#94a3b8]">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Role Title</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-[#a3a3a3]" colSpan={6}>
                      Loading users...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-[#a3a3a3]" colSpan={6}>
                      No user records.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-white/5">
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-[#cbd5e1]">{item.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.role || ""}
                          onChange={(e) => {
                            const role = e.target.value;
                            updateItem(item.id, "role", role);
                            updateItem(item.id, "roleTitle", roleTitleFromRole(role));
                          }}
                          className="w-full rounded-lg bg-white border border-slate-300 px-2 py-1.5 text-slate-900 dark:bg-[#0d111a] dark:border-white/10 dark:text-white"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={item.roleTitle || ""}
                          onChange={(e) =>
                            updateItem(item.id, "roleTitle", e.target.value)
                          }
                          className="w-full rounded-lg bg-white border border-slate-300 px-2 py-1.5 text-slate-900 dark:bg-[#0d111a] dark:border-white/10 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status || "active"}
                          onChange={(e) =>
                            updateItem(item.id, "status", e.target.value)
                          }
                          className="w-full rounded-lg bg-white border border-slate-300 px-2 py-1.5 text-slate-900 dark:bg-[#0d111a] dark:border-white/10 dark:text-white"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const dirty = isUserDirty(item);
                          return (
                        <Button
                          type="button"
                          variant={dirty ? "success" : "secondary"}
                          onClick={() => void handleSave(item)}
                          disabled={savingId === item.id || !dirty}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 ${
                            dirty
                              ? "!bg-[#4cceac] !text-[#141b2d] hover:!bg-[#5fd8b9]"
                              : ""
                          }`}
                        >
                          {savingId === item.id ? "Saving..." : "Save"}
                        </Button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-white/5 dark:bg-[#141b2d] dark:shadow-2xl">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-white/5 dark:bg-[#0f141d] dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">Web routes</span> use{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-emerald-700 dark:bg-white/5 dark:text-[#7dd3c0]">
              HashRouter
            </code>{" "}
            (<code className="rounded bg-slate-100 px-1 text-[11px] text-slate-700 dark:bg-white/5 dark:text-slate-300">
              #
            </code>{" "}
            + path in the URL). Declared under{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-emerald-700 dark:bg-white/5 dark:text-[#7dd3c0]">
              App.tsx
            </code>
            .
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-slate-600 dark:bg-[#0d111a] dark:text-[#94a3b8]">
                <tr>
                  <th className="w-[140px] text-left px-4 py-3 align-bottom">
                    Role
                  </th>
                  <th className="min-w-[320px] text-left px-4 py-3 align-bottom font-normal">
                    <span className="block font-semibold text-slate-800 dark:text-[#cbd5e1]">
                      Manage Demo / permissions
                    </span>
                    <span className="mt-1 block text-[11px] font-normal capitalize tracking-normal text-slate-500 dark:text-slate-500">
                      Checkbox + paths where each action runs in the web app.
                    </span>
                  </th>
                  <th className="min-w-[200px] text-left px-4 py-3 align-bottom">
                    Allowed Routes
                  </th>
                  <th className="w-[110px] text-right px-4 py-3 align-bottom">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissionsLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-[#a3a3a3]" colSpan={4}>
                      Loading permissions...
                    </td>
                  </tr>
                ) : (
                  ROLE_OPTIONS.map((option) => {
                    const role = option.value;
                    const canUse =
                      permissions[role]?.manageDemo?.canUseFileActionButtons ===
                      true;
                    const canSwitch =
                      permissions[role]?.manageDemo?.canSwitchSftpHost === true;
                    const canSetupMedia =
                      permissions[role]?.manageDemo?.canSetupMediaSftp === true;
                    const canDownloadCreative =
                      permissions[role]?.creativeShowcase?.canDownload === true;
                    const selectedRoutes = new Set(
                      Array.isArray(permissions[role]?.routeAccess?.allowedRoutes)
                        ? permissions[role]?.routeAccess?.allowedRoutes
                        : [],
                    );
                    return (
                      <tr key={role} className="border-t border-slate-100 dark:border-white/5">
                        <td className="align-top px-4 py-4 text-slate-900 dark:text-white whitespace-nowrap">
                          {option.label}
                        </td>
                        <td className="align-top px-4 py-4">
                          <div className="flex max-w-xl flex-col gap-2">
                            <PermissionCheckboxRow
                              checked={canUse}
                              onChecked={(v) => updatePermission(role, v)}
                              title={
                                <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">
                                  canUseFileActionButtons
                                </span>
                              }
                              subtitle="Toolbar actions on Manage Demo file list"
                              paths={[WEB_MANAGE_DEMO]}
                            />
                            {role === "admin" ? (
                              <PermissionCheckboxRow
                                checked={canSwitch}
                                onChecked={(v) =>
                                  updateCanSwitchSftpHost(role, v)
                                }
                                title={
                                  <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">
                                    canSwitchSftpHost
                                  </span>
                                }
                                subtitle="Switch demo ↔ media SFTP host on Manage Demo"
                                paths={[WEB_MANAGE_DEMO]}
                              />
                            ) : (
                              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500 dark:border-white/10 dark:bg-[#0d111a]/50 dark:text-slate-500">
                                <span className="font-mono text-slate-600 dark:text-slate-400">
                                  canSwitchSftpHost
                                </span>{" "}
                                — admin only
                              </p>
                            )}
                            <PermissionCheckboxRow
                              checked={canSetupMedia}
                              onChecked={(v) => updateCanSetupMediaSftp(role, v)}
                              title={
                                <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">
                                  canSetupMediaSftp
                                </span>
                              }
                              subtitle="Build Demo: copy converted upload from demo SFTP to media SFTP"
                              paths={[WEB_BUILD_DEMO_SETUP]}
                            />
                            <div className="flex flex-col gap-2 rounded-xl border border-[#4cceac]/25 bg-[#4cceac]/[0.08] p-2.5 dark:border-[#4cceac]/15 dark:bg-[#4cceac]/[0.04]">
                              <div className="px-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-[#94a3b8]">
                                  SFTP mutations
                                </span>
                              </div>
                              {SFTP_ACL_FIELDS.map((f) => (
                                <PermissionCheckboxRow
                                  key={f.key}
                                  checked={
                                    permissions[role]?.manageDemo?.[f.key] ===
                                    true
                                  }
                                  onChecked={(v) => updateSftpAcl(role, f.key, v)}
                                  title={
                                    <>
                                      <span className="text-slate-800 dark:text-[#cbd5e1]">
                                        {f.title}
                                      </span>
                                      {f.detail ? (
                                        <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-500">
                                          · {f.detail}
                                        </span>
                                      ) : null}
                                    </>
                                  }
                                  paths={f.paths}
                                />
                              ))}
                            </div>
                            <PermissionCheckboxRow
                              checked={canDownloadCreative}
                              onChecked={(v) =>
                                updateCreativeShowcaseDownload(role, v)
                              }
                              title="Creative ZIP download"
                              subtitle="Creative Showcase folder download"
                              paths={[WEB_CREATIVE]}
                            />
                          </div>
                        </td>
                        <td className="align-top px-4 py-4">
                          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                            {availableRoutes.map((route) => (
                              <label
                                key={`${role}-${route}`}
                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 transition-colors hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#0d111a]/60 dark:text-[#cbd5e1] dark:hover:border-white/10"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedRoutes.has(route)}
                                  onChange={(e) => {
                                    const next = new Set(selectedRoutes);
                                    if (e.target.checked) {
                                      next.add(route);
                                    } else {
                                      next.delete(route);
                                    }
                                    updatePermissionRoutes(role, Array.from(next));
                                  }}
                                  className="h-4 w-4 shrink-0 accent-[#4cceac]"
                                />
                                <span className="font-mono text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                                  {route}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="align-top px-4 py-4 text-right">
                          {(() => {
                            const dirty = isPermissionDirty(role);
                            return (
                          <Button
                            type="button"
                            variant={dirty ? "success" : "secondary"}
                            onClick={() => void handleSavePermission(role)}
                            disabled={savingPermissionRole === role || !dirty}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 ${
                              dirty
                                ? "!bg-[#4cceac] !text-[#141b2d] hover:!bg-[#5fd8b9]"
                                : ""
                            }`}
                          >
                            {savingPermissionRole === role ? "Saving..." : "Save"}
                          </Button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
