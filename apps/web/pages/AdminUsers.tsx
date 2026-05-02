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
      currentCreativeDownload !== originalCreativeDownload ||
      JSON.stringify(currentRoutes) !== JSON.stringify(originalRoutes)
    );
  };

  return (
    <div className="w-full px-8 pt-10 pb-16 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            User & Permission Management
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
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
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
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
              ? "border-[#4cceac] bg-[#4cceac]/20 text-[#9ff3de]"
              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Users
        </Button>
        <Button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
            activeTab === "permissions"
              ? "border-[#4cceac] bg-[#4cceac]/20 text-[#9ff3de]"
              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Permissions
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
          {message}
        </div>
      )}

      {activeTab === "users" ? (
        <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[#0d111a] text-[#94a3b8]">
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
                    <td className="px-4 py-6 text-center text-[#a3a3a3]" colSpan={6}>
                      Loading users...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#a3a3a3]" colSpan={6}>
                      No user records.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-white">{item.name}</td>
                      <td className="px-4 py-3 text-[#cbd5e1]">{item.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={item.role || ""}
                          onChange={(e) => {
                            const role = e.target.value;
                            updateItem(item.id, "role", role);
                            updateItem(item.id, "roleTitle", roleTitleFromRole(role));
                          }}
                          className="w-full rounded-lg bg-[#0d111a] border border-white/10 px-2 py-1.5 text-white"
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
                          className="w-full rounded-lg bg-[#0d111a] border border-white/10 px-2 py-1.5 text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status || "active"}
                          onChange={(e) =>
                            updateItem(item.id, "status", e.target.value)
                          }
                          className="w-full rounded-lg bg-[#0d111a] border border-white/10 px-2 py-1.5 text-white"
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
        <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-[#0d111a] text-[#94a3b8]">
                <tr>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">
                    Manage Demo / permissions
                  </th>
                  <th className="text-left px-4 py-3">Allowed Routes</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {permissionsLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#a3a3a3]" colSpan={4}>
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
                    const canDownloadCreative =
                      permissions[role]?.creativeShowcase?.canDownload === true;
                    const selectedRoutes = new Set(
                      Array.isArray(permissions[role]?.routeAccess?.allowedRoutes)
                        ? permissions[role]?.routeAccess?.allowedRoutes
                        : [],
                    );
                    return (
                      <tr key={role} className="border-t border-white/5">
                        <td className="px-4 py-3 text-white">{option.label}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-2.5">
                            <label className="inline-flex items-center gap-2 text-[#cbd5e1]">
                              <input
                                type="checkbox"
                                checked={canUse}
                                onChange={(e) =>
                                  updatePermission(role, e.target.checked)
                                }
                                className="h-4 w-4 accent-[#4cceac]"
                              />
                              <span className="text-xs">
                                canUseFileActionButtons
                              </span>
                            </label>
                            {role === "admin" ? (
                              <label className="inline-flex items-center gap-2 text-[#cbd5e1]">
                                <input
                                  type="checkbox"
                                  checked={canSwitch}
                                  onChange={(e) =>
                                    updateCanSwitchSftpHost(
                                      role,
                                      e.target.checked,
                                    )
                                  }
                                  className="h-4 w-4 accent-[#4cceac]"
                                />
                                <span className="text-xs leading-snug">
                                  canSwitchSftpHost (demo ↔ media SFTP on Manage
                                  Demo)
                                </span>
                              </label>
                            ) : (
                              <p className="text-[11px] text-slate-500 italic">
                                canSwitchSftpHost — admin only
                              </p>
                            )}
                            <label className="inline-flex items-center gap-2 text-[#cbd5e1]">
                              <input
                                type="checkbox"
                                checked={canDownloadCreative}
                                onChange={(e) =>
                                  updateCreativeShowcaseDownload(
                                    role,
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 accent-[#4cceac]"
                              />
                              <span className="text-xs leading-snug">
                                Creative Showcase — allow ZIP download
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {availableRoutes.map((route) => (
                              <label
                                key={`${role}-${route}`}
                                className="inline-flex items-center gap-2 text-[#cbd5e1]"
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
                                  className="h-4 w-4 accent-[#4cceac]"
                                />
                                <span className="text-xs">{route}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
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
