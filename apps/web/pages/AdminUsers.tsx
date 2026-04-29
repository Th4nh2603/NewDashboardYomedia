import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";
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
    };
  }
>;

type AdminTab = "users" | "permissions";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "adsopmanager", label: "AdsOp Manager" },
  { value: "adsop", label: "AdsOp" },
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

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const roleHeader = (user?.role || "").toLowerCase();
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const [activeTab, setActiveTab] = React.useState<AdminTab>("users");

  const [items, setItems] = React.useState<Account[]>([]);
  const [permissions, setPermissions] = React.useState<RolePermissionConfig>({});
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
      }>(`${baseUrl}/api/admin/permissions`, {
        headers: { "x-user-role": roleHeader },
      });
      setPermissions(data.permissions || {});
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

  const handleSavePermission = async (role: string) => {
    setSavingPermissionRole(role);
    setError(null);
    setMessage(null);
    try {
      const canUseFileActionButtons =
        permissions[role]?.manageDemo?.canUseFileActionButtons === true;
      await fetchJsonOrThrow(`${baseUrl}/api/admin/permissions/${role}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": roleHeader,
        },
        body: JSON.stringify({
          manageDemo: {
            canUseFileActionButtons,
          },
        }),
      });
      setMessage(`Updated permission for role: ${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update permission");
    } finally {
      setSavingPermissionRole(null);
    }
  };

  return (
    <div className="w-full px-8 pt-10 pb-16 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            User & Permission Management
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
            Tách riêng quản lý người dùng và cấu hình permission theo role.
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
                        <Button
                          type="button"
                          onClick={() => void handleSave(item)}
                          disabled={savingId === item.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40"
                        >
                          {savingId === item.id ? "Saving..." : "Save"}
                        </Button>
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
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#0d111a] text-[#94a3b8]">
                <tr>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Manage Demo / File Actions</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {permissionsLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#a3a3a3]" colSpan={3}>
                      Loading permissions...
                    </td>
                  </tr>
                ) : (
                  ROLE_OPTIONS.map((option) => {
                    const role = option.value;
                    const canUse =
                      permissions[role]?.manageDemo?.canUseFileActionButtons ===
                      true;
                    return (
                      <tr key={role} className="border-t border-white/5">
                        <td className="px-4 py-3 text-white">{option.label}</td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-[#cbd5e1]">
                            <input
                              type="checkbox"
                              checked={canUse}
                              onChange={(e) => updatePermission(role, e.target.checked)}
                              className="h-4 w-4 accent-[#4cceac]"
                            />
                            <span className="text-xs">
                              canUseFileActionButtons
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            onClick={() => void handleSavePermission(role)}
                            disabled={savingPermissionRole === role}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40"
                          >
                            {savingPermissionRole === role ? "Saving..." : "Save"}
                          </Button>
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
