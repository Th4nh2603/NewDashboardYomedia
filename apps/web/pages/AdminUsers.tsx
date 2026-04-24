import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";

type Account = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  roleTitle: string | null;
  status: string | null;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator" },
  { value: "adsopmanager", label: "AdsOp Manager" },
  { value: "adsop", label: "AdsOp" },
  { value: "design", label: "Design" },
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

  const [items, setItems] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

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

  return (
    <div className="w-full px-8 pt-10 pb-16 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            User Management
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
            Quản lý tài khoản và phân quyền cho người dùng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAccounts()}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
        >
          Reload
        </button>
      </header>

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
                      <button
                        type="button"
                        onClick={() => void handleSave(item)}
                        disabled={savingId === item.id}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40"
                      >
                        {savingId === item.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
