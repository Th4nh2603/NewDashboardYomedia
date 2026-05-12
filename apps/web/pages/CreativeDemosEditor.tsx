import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { fetchJsonOrThrow } from "../lib/apiError";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import Button from "../components/Button";

type DemoRow = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseCreativeDemosDoc(raw: string): {
  extra: Record<string, unknown>;
  demos: DemoRow[];
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { extra: {}, demos: [] };
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!isRecord(parsed)) {
    return { extra: {}, demos: [] };
  }
  const { demos, ...extra } = parsed;
  const list = Array.isArray(demos)
    ? demos.filter(isRecord).map((d) => ({ ...d }))
    : [];
  return { extra, demos: list };
}

function serializeCreativeDemosDoc(
  extra: Record<string, unknown>,
  demos: DemoRow[],
): string {
  return `${JSON.stringify({ ...extra, demos }, null, 2)}\n`;
}

function demoId(d: DemoRow): string {
  return String(d.id ?? "").trim();
}

function demoTitle(d: DemoRow): string {
  return String(d.title ?? "").trim();
}

function sizeToLines(size: unknown): string {
  if (Array.isArray(size)) {
    return size.map((s) => String(s)).join("\n");
  }
  if (typeof size === "string") return size;
  return "";
}

function linesToSize(text: string): string | string[] {
  const parts = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  if (parts.length === 1) return parts[0];
  return parts;
}

function rowToEditorState(row: DemoRow): Record<string, string | boolean> {
  return {
    id: demoId(row),
    title: demoTitle(row),
    image: String(row.image ?? ""),
    sizeLines: sizeToLines(row.size),
    position: String(row.position ?? ""),
    fileType: String(row.fileType ?? ""),
    file: row.file != null ? String(row.file) : "",
    category: String(row.category ?? "Display"),
    value: row.value != null ? String(row.value) : "",
    format: row.format != null ? String(row.format) : "",
    video: String(row.video ?? ""),
    source: String(row.source ?? ""),
    status: String(row.status ?? "inactive"),
    delivery: String(row.delivery ?? ""),
    deliveryNameReplace: String(row["delivery-name-replace"] ?? ""),
    fla: row.fla === true,
  };
}

function applyEditorState(
  base: DemoRow,
  s: Record<string, string | boolean>,
): DemoRow {
  const sizeVal = linesToSize(String(s.sizeLines ?? ""));
  const next: DemoRow = { ...base };
  next.id = String(s.id ?? "").trim();
  next.title = String(s.title ?? "").trim();
  next.image = String(s.image ?? "");
  if (sizeVal === "" || (Array.isArray(sizeVal) && sizeVal.length === 0)) {
    delete next.size;
  } else {
    next.size = sizeVal;
  }
  next.position = String(s.position ?? "");
  next.fileType = String(s.fileType ?? "");
  if (String(s.file ?? "").trim() === "") delete next.file;
  else next.file = String(s.file ?? "").trim();
  next.category = String(s.category ?? "Display");
  if (String(s.value ?? "").trim() === "") delete next.value;
  else next.value = String(s.value ?? "").trim();
  if (String(s.format ?? "").trim() === "") delete next.format;
  else next.format = String(s.format ?? "").trim();
  next.video = String(s.video ?? "");
  next.source = String(s.source ?? "");
  next.status = String(s.status ?? "inactive");
  const delivery = String(s.delivery ?? "");
  const dnr = String(s.deliveryNameReplace ?? "");
  if (delivery === "") delete next.delivery;
  else next.delivery = delivery;
  if (dnr === "") delete next["delivery-name-replace"];
  else next["delivery-name-replace"] = dnr;
  next.fla = s.fla === true;
  return next;
}

function nextDemoId(demos: DemoRow[]): string {
  let max = 0;
  for (const d of demos) {
    const n = parseInt(demoId(d), 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(4, "0");
}

const CreativeDemosEditor: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const baseUrl = serverApiOrigin();
  const role = (user?.role || "").toLowerCase();
  const canEdit = role === "admin";

  const [extra, setExtra] = React.useState<Record<string, unknown>>({});
  const [demos, setDemos] = React.useState<DemoRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("all");

  const [editIndex, setEditIndex] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Record<string, string | boolean>>(
    {},
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        content?: string;
        error?: string;
      }>(`${baseUrl}/api/test-data`, {
        headers: { "x-user-role": role },
      });
      if (!data.ok) {
        throw new Error(data.error || "Unable to load creative-demos.json");
      }
      const raw =
        typeof data.content === "string" ? data.content : '{"demos":[]}\n';
      const { extra: ex, demos: list } = parseCreativeDemosDoc(raw);
      setExtra(ex);
      setDemos(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load creative-demos.json",
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, role]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSaveAll = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = serializeCreativeDemosDoc(extra, demos);
      JSON.parse(body);
      const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/test-data`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": role,
          },
          body: JSON.stringify({ content: body }),
        },
      );
      if (!data.ok) {
        throw new Error(data.error || "Save failed");
      }
      setMessage("creative-demos.json saved.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return demos
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        const c = String(row.category ?? "").trim();
        if (catFilter !== "all" && c !== catFilter) return false;
        if (!q) return true;
        const hay = [
          demoId(row),
          demoTitle(row),
          String(row.value ?? ""),
          String(row.source ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [demos, query, catFilter]);

  const openEdit = (index: number) => {
    setDraft(rowToEditorState(demos[index]));
    setEditIndex(index);
  };

  const closeEdit = () => {
    setEditIndex(null);
    setDraft({});
  };

  const applyDraft = () => {
    if (editIndex == null) return;
    const base = demos[editIndex];
    setDemos((prev) => {
      const next = [...prev];
      next[editIndex] = applyEditorState(base, draft);
      return next;
    });
    closeEdit();
  };

  const removeAt = (index: number) => {
    if (!canEdit) return;
    if (!window.confirm("Remove this demo from the list?")) return;
    setDemos((prev) => prev.filter((_, i) => i !== index));
    if (editIndex === index) closeEdit();
    else if (editIndex != null && editIndex > index) {
      setEditIndex(editIndex - 1);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= demos.length) return;
    setDemos((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    if (editIndex === index) setEditIndex(j);
    else if (editIndex === j) setEditIndex(index);
  };

  const addDemo = () => {
    if (!canEdit) return;
    const id = nextDemoId(demos);
    const template: DemoRow = {
      id,
      title: "New demo",
      image: "",
      size: ["320x50"],
      position: "-",
      fileType: "HTML5",
      file: "index.html",
      category: "Display",
      value: `demo-${id}`,
      video: "none",
      source: `yomedia/app/template/data/${id}/banner`,
      status: "inactive",
      delivery: "",
      "delivery-name-replace": "",
      fla: false,
    };
    setDemos((prev) => [...prev, template]);
    setDraft(rowToEditorState(template));
    setEditIndex(demos.length);
  };

  React.useEffect(() => {
    if (editIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editIndex]);

  const fieldClass = `w-full rounded-xl border text-xs px-3 py-2 outline-none focus:border-[#4cceac]/50 ${
    isDark
      ? "border-white/10 bg-[#0d111a] text-white/90"
      : "border-slate-300 bg-white text-slate-900"
  }`;

  return (
    <div className="w-full px-8 pt-10 space-y-6 pb-16">
      <header className="relative mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-1 w-10 h-10 rounded-2xl border flex items-center justify-center ${
                isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
              }`}
            >
              <TableCellsIcon className="w-6 h-6 text-[#4cceac]" />
            </div>
            <div>
              <h1
                className={`text-2xl font-black tracking-tight uppercase italic ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Creative demos data
              </h1>
              <p
                className={`text-xs font-medium mt-1 max-w-2xl ${
                  isDark ? "text-[#a3a3a3]" : "text-slate-600"
                }`}
              >
                Chỉnh sửa{" "}
                <span className={isDark ? "text-white/90" : "text-slate-800"}>
                  apps/server/src/data/creative-demos.json
                </span>{" "}
                dạng bảng. Lưu toàn bộ file một lần. Raw JSON:{" "}
                <Link
                  to="/test-data"
                  className="text-[#4cceac] hover:underline font-semibold"
                >
                  Test data
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reload
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={addDemo}
                disabled={loading}
                className="inline-flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Thêm demo
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSaveAll()}
              disabled={!canEdit || saving || loading}
              className="inline-flex items-center gap-2 !bg-[#4cceac] !text-[#141b2d] hover:!opacity-90"
            >
              {saving ? "Saving…" : "Lưu file"}
            </Button>
          </div>
        </div>
        <div
          className={`absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 to-transparent ${
            isDark ? "via-[#3d465d]" : "via-slate-300"
          }`}
        />
      </header>

      {error && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
            isDark
              ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
              : "border-rose-300 bg-rose-50 text-rose-700"
          }`}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
            isDark
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-emerald-300 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

        {!canEdit && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
            isDark
              ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          Bạn chỉ xem được. Chỉ admin mới lưu được thay đổi.
        </div>
      )}

      <div
        className={`rounded-[2rem] border overflow-hidden p-4 md:p-5 space-y-4 ${
          isDark
            ? "border-white/5 bg-[#141b2d] shadow-2xl"
            : "border-slate-200 bg-white shadow-lg"
        }`}
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <label className="flex-1 min-w-0">
            <span
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
                isDark ? "text-[#a3a3a3]" : "text-slate-600"
              }`}
            >
              Tìm kiếm
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="id, title, value, source…"
              className={fieldClass}
            />
          </label>
          <label className="w-full lg:w-48">
            <span
              className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${
                isDark ? "text-[#a3a3a3]" : "text-slate-600"
              }`}
            >
              Category
            </span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={fieldClass}
            >
              <option value="all">Tất cả</option>
              <option value="Display">Display</option>
              <option value="Mobile">Mobile</option>
              <option value="Video">Video</option>
            </select>
          </label>
        </div>
        <p className={`text-[11px] ${isDark ? "text-[#94a3b8]" : "text-slate-500"}`}>
          {loading
            ? "Đang tải…"
            : `${demos.length} demo — hiển thị ${filtered.length} sau lọc`}
        </p>

        {loading ? (
          <div
            className={`py-20 text-center text-sm ${
              isDark ? "text-[#a3a3a3]" : "text-slate-500"
            }`}
          >
            Loading…
          </div>
        ) : (
          <div
            className={`overflow-x-auto rounded-2xl border ${
              isDark ? "border-white/5" : "border-slate-200"
            }`}
          >
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead>
                <tr
                  className={`border-b text-[10px] font-black uppercase tracking-widest ${
                    isDark
                      ? "border-white/10 text-[#a3a3a3]"
                      : "border-slate-200 text-slate-600 bg-slate-50"
                  }`}
                >
                  <th className="px-3 py-2 w-14">Ảnh</th>
                  <th className="px-3 py-2 w-20">ID</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2 w-24">Category</th>
                  <th className="px-3 py-2 w-24">Status</th>
                  <th className="px-3 py-2 w-32">Value</th>
                  <th className="px-3 py-2 w-40 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ row, index }) => {
                  const st = String(row.status ?? "").toLowerCase();
                  return (
                    <tr
                      key={`${demoId(row)}-${index}`}
                      className={`border-b ${
                        isDark
                          ? "border-white/5 hover:bg-white/[0.03]"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-2 align-middle">
                        {String(row.image ?? "").trim() ? (
                          <img
                            src={String(row.image)}
                            alt=""
                            className={`w-12 h-12 rounded-lg object-cover border ${
                              isDark
                                ? "bg-black/30 border-white/10"
                                : "bg-slate-100 border-slate-200"
                            }`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity =
                                "0.2";
                            }}
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-lg border ${
                              isDark
                                ? "bg-white/5 border-white/10"
                                : "bg-slate-100 border-slate-200"
                            }`}
                          />
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 font-mono ${
                          isDark ? "text-white/80" : "text-slate-700"
                        }`}
                      >
                        {demoId(row)}
                      </td>
                      <td
                        className={`px-3 py-2 max-w-[220px] truncate ${
                          isDark ? "text-white/90" : "text-slate-900"
                        }`}
                      >
                        {demoTitle(row)}
                      </td>
                      <td
                        className={`px-3 py-2 ${
                          isDark ? "text-[#94a3b8]" : "text-slate-600"
                        }`}
                      >
                        {String(row.category ?? "—")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            st === "active"
                              ? isDark
                                ? "text-emerald-400"
                                : "text-emerald-600"
                              : isDark
                                ? "text-slate-500"
                                : "text-slate-500"
                          }
                        >
                          {String(row.status ?? "—")}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 font-mono max-w-[120px] truncate ${
                          isDark ? "text-[#94a3b8]" : "text-slate-600"
                        }`}
                      >
                        {String(row.value ?? "—")}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            title="Lên"
                            disabled={!canEdit || index === 0}
                            onClick={() => move(index, -1)}
                            className={`p-1.5 rounded-lg disabled:opacity-30 ${
                              isDark
                                ? "text-white/50 hover:text-white hover:bg-white/10"
                                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            <ChevronUpIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Xuống"
                            disabled={!canEdit || index >= demos.length - 1}
                            onClick={() => move(index, 1)}
                            className={`p-1.5 rounded-lg disabled:opacity-30 ${
                              isDark
                                ? "text-white/50 hover:text-white hover:bg-white/10"
                                : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            <ChevronDownIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Sửa"
                            onClick={() => openEdit(index)}
                            className="p-1.5 rounded-lg text-[#4cceac] hover:bg-[#4cceac]/15"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Xóa"
                            disabled={!canEdit}
                            onClick={() => removeAt(index)}
                            className="p-1.5 rounded-lg text-rose-300 hover:bg-rose-500/15 disabled:opacity-30"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p
                className={`text-center py-10 text-sm ${
                  isDark ? "text-[#a3a3a3]" : "text-slate-500"
                }`}
              >
                Không có dòng nào khớp bộ lọc.
              </p>
            )}
          </div>
        )}
      </div>

      {editIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="creative-demo-edit-title"
        >
          <div
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${
              isDark ? "border-white/10 bg-[#141b2d]" : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b z-10 ${
                isDark
                  ? "border-white/10 bg-[#141b2d]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h2
                id="creative-demo-edit-title"
                className={`text-sm font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Sửa demo
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className={`p-2 rounded-xl ${
                  isDark
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
                aria-label="Đóng"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {(
                [
                  ["id", "ID"],
                  ["title", "Title"],
                  ["image", "Image URL"],
                  ["position", "Position"],
                  ["fileType", "File type"],
                  ["file", "Entry file (e.g. index.html, tvc.mp4)"],
                  ["value", "Value (f=)"],
                  ["format", "Format (tuỳ chọn)"],
                  ["video", "Video"],
                  ["source", "Source (SFTP path)"],
                  ["delivery", "Delivery URL"],
                  ["deliveryNameReplace", "Delivery name replace"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                      isDark ? "text-[#a3a3a3]" : "text-slate-600"
                    }`}
                  >
                    {label}
                  </span>
                  <input
                    type="text"
                    value={String(draft[key] ?? "")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
              ))}
              <label className="block">
                <span
                  className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                    isDark ? "text-[#a3a3a3]" : "text-slate-600"
                  }`}
                >
                  Size (mỗi dòng một kích thước)
                </span>
                <textarea
                  value={String(draft.sizeLines ?? "")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sizeLines: e.target.value }))
                  }
                  rows={3}
                  className={`${fieldClass} font-mono resize-y min-h-[72px]`}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                      isDark ? "text-[#a3a3a3]" : "text-slate-600"
                    }`}
                  >
                    Category
                  </span>
                  <select
                    value={String(draft.category ?? "Display")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, category: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    <option value="Display">Display</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Video">Video</option>
                  </select>
                </label>
                <label className="block">
                  <span
                    className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                      isDark ? "text-[#a3a3a3]" : "text-slate-600"
                    }`}
                  >
                    Status
                  </span>
                  <select
                    value={String(draft.status ?? "inactive")}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, status: e.target.value }))
                    }
                    className={fieldClass}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={draft.fla === true}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, fla: e.target.checked }))
                  }
                  className={`rounded text-[#4cceac] focus:ring-[#4cceac]/40 ${
                    isDark ? "border-white/20 bg-[#0d111a]" : "border-slate-300 bg-white"
                  }`}
                />
                <span className={`text-xs ${isDark ? "text-white/80" : "text-slate-700"}`}>
                  fla (Adobe FLA)
                </span>
              </label>
            </div>
            <div
              className={`sticky bottom-0 flex gap-2 justify-end px-5 py-4 border-t ${
                isDark
                  ? "border-white/10 bg-[#141b2d]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Button type="button" variant="secondary" onClick={closeEdit}>
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={applyDraft}
                className="!bg-[#4cceac] !text-[#141b2d]"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeDemosEditor;
