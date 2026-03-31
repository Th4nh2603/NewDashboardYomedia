import React from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

const TestData: React.FC = () => {
  const { user } = useAuth();
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const role = (user?.role || "").toLowerCase();
  const canEdit = role === "admin" || role === "design";

  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}/api/test-data`, {
        headers: { "x-user-role": role },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        content?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to load test.json");
      }
      setContent(typeof data.content === "string" ? data.content : "{}\n");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load test.json");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, role]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}/api/test-data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
        },
        body: JSON.stringify({ content: content == null ? "" : String(content) }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Save failed");
      }
      setMessage("Đã lưu test.json.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-8 pt-10 space-y-6 pb-16">
      <header className="relative mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-[#4cceac]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                Test data (test.json)
              </h1>
              <p className="text-[#a3a3a3] text-xs font-medium mt-1 max-w-xl">
                Chỉnh sửa nội dung file{" "}
                <span className="text-white/90">apps/server/src/data/test.json</span>
                . Chỉ tài khoản admin hoặc design được phép lưu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            Tải lại
          </button>
        </div>
        <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
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

      {!canEdit && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          Bạn chỉ có thể xem nội dung. Để lưu thay đổi cần quyền admin hoặc design.
        </div>
      )}

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
            JSON
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canEdit || saving || loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-sm text-[#a3a3a3] text-center">
            Đang tải…
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={!canEdit}
            spellCheck={false}
            className="w-full min-h-[420px] bg-[#0d111a] text-white/90 text-sm font-mono leading-relaxed px-5 py-4 outline-none border-0 resize-y disabled:opacity-80"
            aria-label="Nội dung test.json"
          />
        )}
      </div>
    </div>
  );
};

export default TestData;
