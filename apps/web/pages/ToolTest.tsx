import React from "react";
import {
  ArrowPathIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/trpc/api";
import Button from "../components/Button";

type PlatformBannerColumn = { name: string; label: string };
type PlatformFormFieldOption = {
  value: string;
  label: string;
  selected?: boolean;
  width?: number;
  height?: number;
};
type PlatformFormField = {
  id: string;
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file" | "size";
  value?: string;
  placeholder?: string;
  maxlength?: number;
  checked?: boolean;
  width?: string;
  height?: string;
  options?: PlatformFormFieldOption[];
  optionTotal?: number;
};
type PlatformBannerCreateForm = {
  url: string;
  title: string;
  formAction: string;
  fields: PlatformFormField[];
};
type PlatformBannerPage = {
  url: string;
  fetchedAt: string;
  title: string;
  profileName: string | null;
  profileRole: string | null;
  grid: {
    page: number;
    total: number;
    records: number;
    rows: Record<string, unknown>[];
    columns: PlatformBannerColumn[];
  };
  createForm: PlatformBannerCreateForm;
};

const inputClass = (isDark: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm ${
    isDark
      ? "bg-slate-900/60 border-white/10 text-white"
      : "bg-white border-slate-200 text-slate-900"
  }`;

function BannerCreateField({
  field,
  isDark,
}: {
  field: PlatformFormField;
  isDark: boolean;
}) {
  if (field.type === "size") {
    return (
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">Width</span>
          <input
            readOnly
            className={`${inputClass(isDark)} w-24 font-mono`}
            value={field.width ?? ""}
          />
          <span className="text-xs opacity-60">px</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">Height</span>
          <input
            readOnly
            className={`${inputClass(isDark)} w-24 font-mono`}
            value={field.height ?? ""}
          />
          <span className="text-xs opacity-60">px</span>
        </div>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className="space-y-1">
        <select
          readOnly
          className={inputClass(isDark)}
          value={field.value ?? ""}
          onChange={() => undefined}
        >
          {(field.options ?? []).map((opt) => (
            <option key={`${opt.value}-${opt.label}`} value={opt.value}>
              {opt.label}
              {opt.width && opt.height ? ` (${opt.width}x${opt.height})` : ""}
            </option>
          ))}
        </select>
        {field.optionTotal ? (
          <p className="text-[10px] opacity-50">
            +{(field.optionTotal - (field.options?.length ?? 0)).toLocaleString()}{" "}
            mục khác trên platform
          </p>
        ) : null}
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        readOnly
        rows={field.name === "code_tag" ? 6 : 3}
        className={`${inputClass(isDark)} font-mono resize-y`}
        value={field.value ?? ""}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="inline-flex items-center gap-2 cursor-default">
        <span
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
            field.checked ? "bg-[#4cceac]" : isDark ? "bg-slate-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
              field.checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
        <span className="text-sm">{field.checked ? "ON" : "OFF"}</span>
      </label>
    );
  }
  if (field.type === "file") {
    return (
      <input readOnly type="file" className={inputClass(isDark)} disabled />
    );
  }
  return (
    <input
      readOnly
      className={inputClass(isDark)}
      value={field.value ?? ""}
      placeholder={field.placeholder}
    />
  );
}

function cellText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const ToolTest: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<PlatformBannerPage | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.toolTest.platformBanner();
      if (!data?.ok || !data.page) {
        throw new Error("No banner data returned");
      }
      setPage(data.page);
    } catch (err) {
      setPage(null);
      setError(
        err instanceof Error ? err.message : "Failed to load platform banner",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const cardClass = `rounded-2xl border p-5 ${
    isDark
      ? "bg-white/5 border-white/10 text-slate-200"
      : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
  }`;

  const visibleColumns =
    page?.grid.columns.filter(
      (c) => !["id", "permission", "notes"].includes(c.name),
    ) ?? [];

  return (
    <div className="max-w-[96rem] mx-auto p-6 md:p-10 space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4cceac] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#4cceac]/20">
            <BeakerIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Tool — Test</h1>
            <p
              className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              Banners từ{" "}
              <a
                href="https://platform.yomedia.vn/banner"
                target="_blank"
                rel="noreferrer"
                className="text-[#4cceac] hover:underline"
              >
                platform.yomedia.vn/banner
              </a>
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2"
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Tải lại
        </Button>
      </header>

      {error && (
        <div
          className={`rounded-2xl border p-4 flex gap-3 ${
            isDark
              ? "bg-amber-500/10 border-amber-500/30 text-amber-100"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-semibold">Không tải được banner</p>
            <p>{error}</p>
            <p className="opacity-80 text-xs">
              Kiểm tra `YOMEDIA_PLATFORM_USERNAME` / `YOMEDIA_PLATFORM_PASSWORD`
              trong `apps/server/.env` và restart server.
            </p>
          </div>
        </div>
      )}

      {loading && !page && !error && (
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Đang đăng nhập platform và tải danh sách banner…
        </p>
      )}

      {page && (
        <>
          <section className={cardClass}>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#4cceac] mb-3">
              Thông tin platform
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="opacity-60 text-xs">title</dt>
                <dd className="font-medium">{page.title}</dd>
              </div>
              <div>
                <dt className="opacity-60 text-xs">profile</dt>
                <dd>
                  {page.profileName ?? "—"}
                  {page.profileRole ? (
                    <span className="opacity-70"> · {page.profileRole}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="opacity-60 text-xs">records</dt>
                <dd className="font-mono">
                  {page.grid.records.toLocaleString()} banner
                  {page.grid.records !== 1 ? "s" : ""} (trang {page.grid.page}/
                  {page.grid.total}, hiển thị {page.grid.rows.length})
                </dd>
              </div>
              <div>
                <dt className="opacity-60 text-xs">fetchedAt</dt>
                <dd className="font-mono text-xs">{page.fetchedAt}</dd>
              </div>
            </dl>
          </section>

          <section className={cardClass}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <div>
                <h2 className="text-lg font-bold">{page.createForm.title}</h2>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Giống UI sau khi bấm <strong>Create New</strong> trên platform (
                  <a
                    href={page.createForm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#4cceac] hover:underline"
                  >
                    /banner/create
                  </a>
                  ) — chỉ xem, chưa gửi form.
                </p>
              </div>
              <p className="text-[10px] font-mono opacity-50 break-all max-w-md">
                POST {page.createForm.formAction}
              </p>
            </div>
            <form className="space-y-4 max-w-3xl">
              {page.createForm.fields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-2 sm:gap-4 items-start"
                >
                  <label
                    className={`text-sm font-medium pt-2 sm:text-right ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {field.label}
                  </label>
                  <BannerCreateField field={field} isDark={isDark} />
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-4 pt-2">
                <div />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-[#4cceac]/30 text-[#4cceac] cursor-not-allowed"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    disabled
                    className={`rounded-lg px-4 py-2 text-sm border cursor-not-allowed ${
                      isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className={cardClass}>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#4cceac] mb-3">
              Danh sách banner (Create New → danh sách)
            </h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm border-collapse min-w-[48rem]">
                <thead>
                  <tr
                    className={
                      isDark
                        ? "border-b border-white/10 text-left text-slate-300"
                        : "border-b border-slate-200 text-left text-slate-600"
                    }
                  >
                    {visibleColumns.map((col) => (
                      <th
                        key={col.name}
                        className="py-2 px-3 font-semibold whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.grid.rows.map((row, rowIdx) => (
                    <tr
                      key={String(row.id ?? rowIdx)}
                      className={
                        isDark
                          ? "border-b border-white/5 hover:bg-white/5"
                          : "border-b border-slate-100 hover:bg-slate-50"
                      }
                    >
                      {visibleColumns.map((col) => (
                        <td
                          key={col.name}
                          className={`py-2 px-3 align-top text-xs max-w-md break-words ${
                            col.name === "banner_name" ? "font-medium" : "font-mono"
                          }`}
                        >
                          {cellText(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ToolTest;
