import React from "react";
import {
  ArrowPathIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/stores/ThemeContext";
import { api } from "@/api/trpc/api";
import {
  mapFormFieldsToPayload,
  normalizeBannerSettings,
} from "@/utils/bannerCreateFieldMap.js";
import Button from "@/components/common/Button";

type PlatformBannerSettingField = {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox";
  value?: string;
  checked?: boolean;
};

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
  onChange,
}: {
  field: PlatformFormField;
  isDark: boolean;
  onChange: (patch: Partial<PlatformFormField>) => void;
}) {
  if (field.type === "size") {
    return (
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">Width</span>
          <input
            className={`${inputClass(isDark)} w-24 font-mono`}
            value={field.width ?? ""}
            onChange={(e) => onChange({ width: e.target.value })}
          />
          <span className="text-xs opacity-60">px</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">Height</span>
          <input
            className={`${inputClass(isDark)} w-24 font-mono`}
            value={field.height ?? ""}
            onChange={(e) => onChange({ height: e.target.value })}
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
          className={inputClass(isDark)}
          value={field.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
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
        rows={field.name === "code_tag" ? 6 : 3}
        className={`${inputClass(isDark)} font-mono resize-y`}
        value={field.value ?? ""}
        onChange={(e) => onChange({ value: e.target.value })}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label
        className="inline-flex items-center gap-2 cursor-pointer"
        onClick={() => onChange({ checked: !field.checked })}
      >
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
      type="text"
      className={inputClass(isDark)}
      value={field.value ?? ""}
      placeholder={field.placeholder}
      maxLength={field.maxlength}
      onChange={(e) => onChange({ value: e.target.value })}
    />
  );
}

function bannerTypeFromFields(fields: PlatformFormField[]): string {
  return (
    fields.find((f) => f.id === "banner_type" || f.name === "type")?.value ??
    "template"
  );
}

function BannerSettingField({
  field,
  isDark,
  value,
  onChange,
}: {
  field: PlatformBannerSettingField;
  isDark: boolean;
  value: string | number;
  onChange: (next: string | number) => void;
}) {
  if (field.type === "checkbox") {
    const on = value === 1 || value === "1";
    return (
      <label
        className="inline-flex items-center gap-2 cursor-pointer"
        onClick={() => onChange(on ? 0 : 1)}
      >
        <span
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
            on ? "bg-[#4cceac]" : isDark ? "bg-slate-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
        <span className="text-sm">{on ? "ON" : "OFF"}</span>
      </label>
    );
  }
  return (
    <input
      type="text"
      className={`${inputClass(isDark)} ${field.type === "number" ? "font-mono" : ""}`}
      value={value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
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
  const [formFields, setFormFields] = React.useState<PlatformFormField[]>([]);
  const [adUnitLoading, setAdUnitLoading] = React.useState(false);
  const [templateLoading, setTemplateLoading] = React.useState(false);
  const [settingsLoading, setSettingsLoading] = React.useState(false);
  const [settingFields, setSettingFields] = React.useState<
    PlatformBannerSettingField[]
  >([]);
  const [templateSettings, setTemplateSettings] = React.useState<
    Record<string, string | number>
  >({});
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const marketFromFields = React.useCallback((fields: PlatformFormField[]) => {
    return (
      fields.find((f) => f.id === "market" || f.name === "market")?.value ?? "vn"
    );
  }, []);

  const loadAdUnitsForAdView = React.useCallback(async (adView: string) => {
    setAdUnitLoading(true);
    try {
      const data = await api.toolTest.bannerAdUnits(adView);
      if (!data?.ok) return;
      setFormFields((prev) =>
        prev.map((f) => {
          if (f.id !== "adunit" && f.name !== "adunit") return f;
          const first = data.options[0];
          return {
            ...f,
            options: data.options,
            value: first?.value ?? "",
            optionTotal: undefined,
          };
        }),
      );
    } catch {
      /* keep current options */
    } finally {
      setAdUnitLoading(false);
    }
  }, []);

  const loadTemplateSettings = React.useCallback(
    async (formatId: string, type: string) => {
      if (!formatId || type === "html_code") {
        setSettingFields([]);
        setTemplateSettings({});
        return;
      }
      setSettingsLoading(true);
      try {
        const data = await api.toolTest.bannerSettings(formatId, type);
        if (!data?.ok) return;
        setSettingFields(data.fields);
        const initial: Record<string, string | number> = {};
        for (const f of data.fields) {
          if (f.type === "checkbox") {
            initial[f.key] = f.checked ? 1 : 0;
          } else {
            initial[f.key] = f.value ?? "";
          }
        }
        setTemplateSettings(initial);
        if (initial.width != null || initial.height != null) {
          setFormFields((prev) =>
            prev.map((f) =>
              f.type === "size"
                ? {
                    ...f,
                    width:
                      initial.width != null
                        ? String(initial.width)
                        : f.width,
                    height:
                      initial.height != null
                        ? String(initial.height)
                        : f.height,
                  }
                : f,
            ),
          );
        }
      } catch {
        setSettingFields([]);
        setTemplateSettings({});
      } finally {
        setSettingsLoading(false);
      }
    },
    [],
  );

  const loadTemplatesForAdView = React.useCallback(
    async (adView: string, market: string) => {
      setTemplateLoading(true);
      try {
        const data = await api.toolTest.bannerTemplates(adView, market);
        if (!data?.ok) return;
        const first = data.options[0];
        setFormFields((prev) => {
          const next = prev.map((f) => {
            if (f.id !== "template" && f.name !== "template") return f;
            return {
              ...f,
              options: data.options,
              value: first?.value ?? "",
              optionTotal: undefined,
            };
          });
          const type = bannerTypeFromFields(next);
          const templateId = first?.value;
          if (templateId && type !== "html_code") {
            void loadTemplateSettings(templateId, type);
          }
          return next;
        });
      } catch {
        /* keep current options */
      } finally {
        setTemplateLoading(false);
      }
    },
    [loadTemplateSettings],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.toolTest.platformBanner();
      if (!data?.ok || !data.page) {
        throw new Error("No banner data returned");
      }
      const fields = data.page.createForm.fields;
      setPage(data.page);
      setFormFields(fields);
      const adView = fields.find((f) => f.id === "ad_view")?.value;
      const market = marketFromFields(fields);
      if (adView) {
        void loadAdUnitsForAdView(adView);
        void loadTemplatesForAdView(adView, market);
      } else {
        const type = bannerTypeFromFields(fields);
        const templateId = fields.find((f) => f.id === "template")?.value;
        if (templateId && type !== "html_code") {
          void loadTemplateSettings(templateId, type);
        }
      }
    } catch (err) {
      setPage(null);
      setFormFields([]);
      setError(
        err instanceof Error ? err.message : "Failed to load platform banner",
      );
    } finally {
      setLoading(false);
    }
  }, [
    loadAdUnitsForAdView,
    loadTemplatesForAdView,
    loadTemplateSettings,
    marketFromFields,
  ]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateFormField = React.useCallback(
    (fieldId: string, patch: Partial<PlatformFormField>) => {
      setFormFields((prev) => {
        const current = prev.find((f) => f.id === fieldId);
        let next = prev.map((f) =>
          f.id === fieldId ? { ...f, ...patch } : f,
        );
        if (current?.type === "select" && patch.value != null) {
          const opt = current.options?.find((o) => o.value === patch.value);
          if (opt?.width != null && opt?.height != null) {
            next = next.map((f) =>
              f.type === "size"
                ? {
                    ...f,
                    width: String(opt.width),
                    height: String(opt.height),
                  }
                : f,
            );
            setTemplateSettings((s) => ({
              ...s,
              width: String(opt.width),
              height: String(opt.height),
            }));
          }
        }
        if (fieldId === "size" && (patch.width != null || patch.height != null)) {
          setTemplateSettings((s) => ({
            ...s,
            ...(patch.width != null ? { width: patch.width } : {}),
            ...(patch.height != null ? { height: patch.height } : {}),
          }));
        }

        const adView =
          fieldId === "ad_view"
            ? patch.value
            : next.find((f) => f.id === "ad_view")?.value;
        const market =
          fieldId === "market" ? patch.value : marketFromFields(next);

        if (fieldId === "ad_view" && patch.value) {
          void loadAdUnitsForAdView(patch.value);
          void loadTemplatesForAdView(patch.value, market);
        } else if (fieldId === "market" && patch.value && adView) {
          void loadTemplatesForAdView(adView, patch.value);
        } else if (fieldId === "template" && patch.value) {
          const type = bannerTypeFromFields(next);
          if (type !== "html_code") {
            void loadTemplateSettings(patch.value, type);
          }
        } else if (fieldId === "banner_type" && patch.value) {
          const templateId = next.find((f) => f.id === "template")?.value;
          if (templateId && patch.value !== "html_code") {
            void loadTemplateSettings(templateId, patch.value);
          } else if (patch.value === "html_code") {
            setSettingFields([]);
            setTemplateSettings({});
          }
        }

        return next;
      });
    },
    [
      loadAdUnitsForAdView,
      loadTemplatesForAdView,
      loadTemplateSettings,
      marketFromFields,
    ],
  );

  const updateTemplateSetting = React.useCallback(
    (key: string, value: string | number) => {
      setTemplateSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "width" || key === "height") {
          setFormFields((fields) =>
            fields.map((f) =>
              f.type === "size"
                ? {
                    ...f,
                    width:
                      key === "width" ? String(value) : f.width,
                    height:
                      key === "height" ? String(value) : f.height,
                  }
                : f,
            ),
          );
        }
        return next;
      });
    },
    [],
  );

  const handleSave = React.useCallback(async () => {
    setSaveLoading(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const sizeField = formFields.find((f) => f.type === "size");
      const settings = normalizeBannerSettings({
        ...templateSettings,
        ...(sizeField?.width ? { width: sizeField.width } : {}),
        ...(sizeField?.height ? { height: sizeField.height } : {}),
      }) as Record<string, string | number>;

      const mapped = mapFormFieldsToPayload(formFields, {
        bannerSettings: settings,
        source: String(settings.source ?? ""),
      });

      const banner_settings =
        typeof mapped.banner_settings === "string"
          ? (JSON.parse(mapped.banner_settings) as Record<
              string,
              string | number
            >)
          : (mapped.banner_settings as Record<string, string | number>);

      const res = await api.toolTest.createBanner({
        banner_name: mapped.banner_name,
        advertiser: mapped.advertiser,
        market: mapped.market,
        landing_page: mapped.landing_page,
        ad_view: mapped.ad_view,
        adunit: mapped.adunit,
        type: mapped.type,
        template: mapped.template,
        use_tag: mapped.use_tag,
        code_tag: mapped.code_tag,
        notes: mapped.notes,
        width: String(mapped.width),
        height: String(mapped.height),
        active: mapped.active,
        source: mapped.source,
        banner_settings,
      });

      if (!res?.ok) {
        throw new Error("Create banner failed");
      }
      setSaveMessage(res.message ?? "Banner created");
      await load();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to create banner",
      );
    } finally {
      setSaveLoading(false);
    }
  }, [formFields, templateSettings, load]);

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
              trong `backend env removed` và restart server.
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
                  ) — chỉnh form rồi bấm <strong>Save changes</strong> để tạo banner trên platform.
                </p>
              </div>
              <p className="text-[10px] font-mono opacity-50 break-all max-w-md">
                POST {page.createForm.formAction}
              </p>
            </div>
            <form className="space-y-4 max-w-3xl">
              {formFields.map((field) => (
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
                  <div className="space-y-1">
                    <BannerCreateField
                      field={field}
                      isDark={isDark}
                      onChange={(patch) => updateFormField(field.id, patch)}
                    />
                    {field.id === "adunit" && adUnitLoading ? (
                      <p className="text-[10px] opacity-50">Đang tải Ad Unit…</p>
                    ) : null}
                    {field.id === "template" && templateLoading ? (
                      <p className="text-[10px] opacity-50">Đang tải Template…</p>
                    ) : null}
                  </div>
                </div>
              ))}
              {settingFields.length > 0 ? (
                <>
                  <div className="border-t border-dashed opacity-20 my-2" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#4cceac]">
                    Template settings
                    {settingsLoading ? " (đang tải…)" : ""}
                  </p>
                  {settingFields.map((sf) => (
                    <div
                      key={sf.key}
                      className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-2 sm:gap-4 items-start"
                    >
                      <label
                        className={`text-sm font-medium pt-2 sm:text-right ${
                          isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {sf.label}
                      </label>
                      <BannerSettingField
                        field={sf}
                        isDark={isDark}
                        value={templateSettings[sf.key] ?? ""}
                        onChange={(v) => updateTemplateSetting(sf.key, v)}
                      />
                    </div>
                  ))}
                </>
              ) : null}
              {saveMessage ? (
                <p className="text-sm text-[#4cceac]">{saveMessage}</p>
              ) : null}
              {saveError ? (
                <p className="text-sm text-red-400">{saveError}</p>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-4 pt-2">
                <div />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saveLoading || loading}
                    onClick={() => void handleSave()}
                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-[#4cceac] text-slate-900 hover:bg-[#3db896] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveLoading ? "Đang lưu…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    disabled={saveLoading}
                    onClick={() => {
                      setSaveMessage(null);
                      setSaveError(null);
                      void load();
                    }}
                    className={`rounded-lg px-4 py-2 text-sm border ${
                      isDark
                        ? "border-white/10 text-slate-300 hover:bg-white/5"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    } disabled:opacity-50`}
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
