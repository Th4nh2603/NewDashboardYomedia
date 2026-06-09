import React from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";
import { api } from "../lib/trpc/api";
import { fetchWithApiAuth } from "../lib/apiAuth";
import { recordActivity } from "../lib/activityLog";
import { downloadPlacementCodesZip } from "../lib/placementCodesDownload";
import { serverApiOrigin, serverApiUrl } from "../lib/serverApiOrigin";
import Button from "../components/Button";

const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

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
  createForm: {
    url: string;
    title: string;
    formAction: string;
    fields: PlatformFormField[];
  };
};

type PlatformPlacementPage = {
  url: string;
  fetchedAt: string;
  title: string;
  grid: PlatformBannerPage["grid"];
  createForm: PlatformBannerPage["createForm"];
};

type PlatformTestSnapshot = {
  fetchedAt: string;
  profileName: string | null;
  profileRole: string | null;
  banner: PlatformBannerPage;
  placement: PlatformPlacementPage;
};

function cellText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldDisplayValue(field: PlatformFormField): string {
  if (field.type === "checkbox") return field.checked ? "ON" : "OFF";
  if (field.type === "size") {
    return `${field.width ?? "—"} × ${field.height ?? "—"} px`;
  }
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === field.value);
    const label = opt?.label ?? field.value ?? "—";
    const count = field.options?.length ?? 0;
    if (count > 0) {
      return `${label} (${count.toLocaleString()} option${count === 1 ? "" : "s"})`;
    }
    return label;
  }
  if (field.type === "file") return "(file upload)";
  return field.value?.trim() ? field.value : "—";
}

function gridColumnsForDisplay(
  columns: PlatformBannerColumn[],
  showAllColumns: boolean,
): PlatformBannerColumn[] {
  if (showAllColumns) {
    return columns.filter((c) => c.name !== "action");
  }
  return columns.filter(
    (c) => !["id", "permission", "notes", "action"].includes(c.name),
  );
}

const GRID_PAGE_SIZE = 100;

type PlacementCodeResult = {
  placementId: string;
  variant: "standard" | "rtb";
  sourceUrl: string;
  code: string;
  meta: {
    placementName: string | null;
    account: string | null;
    site: string | null;
    size: string | null;
    type: string | null;
  };
};

function PlatformModulePanel({
  heading,
  sourceUrl,
  sourceLabel,
  createForm,
  grid,
  nameColumn,
  showAllColumns = false,
  enableGetCode = false,
}: {
  heading: string;
  sourceUrl: string;
  sourceLabel: string;
  createForm: PlatformBannerPage["createForm"];
  grid: PlatformBannerPage["grid"];
  nameColumn: string;
  showAllColumns?: boolean;
  enableGetCode?: boolean;
}) {
  const [gridPage, setGridPage] = React.useState(1);
  const [codeLoading, setCodeLoading] = React.useState(false);
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [codeResult, setCodeResult] =
    React.useState<PlacementCodeResult | null>(null);
  const columns = gridColumnsForDisplay(grid.columns, showAllColumns);
  const totalPages = Math.max(1, Math.ceil(grid.rows.length / GRID_PAGE_SIZE));
  const pageSafe = Math.min(gridPage, totalPages);
  const rowSlice = grid.rows.slice(
    (pageSafe - 1) * GRID_PAGE_SIZE,
    pageSafe * GRID_PAGE_SIZE,
  );
  const allRowsLoaded = grid.rows.length >= grid.records;

  React.useEffect(() => {
    setGridPage(1);
  }, [grid.rows.length, grid.records]);

  const fetchPlacementCode = async (
    placementId: string,
    variant: "standard" | "rtb",
  ) => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const data = await api.testData.placementCode(placementId, variant);
      if (!data?.ok || !data.code) {
        throw new Error("Không lấy được embed code");
      }
      setCodeResult({
        placementId: data.placementId,
        variant: data.variant,
        sourceUrl: data.sourceUrl,
        code: data.code,
        meta: data.meta,
      });
    } catch (err) {
      setCodeResult(null);
      setCodeError(err instanceof Error ? err.message : "Get Code failed");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="space-y-5 pt-2 border-t border-white/5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4cceac]">
          {heading}
        </h3>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-mono text-[#64748b] hover:text-[#4cceac]"
        >
          {sourceLabel}
        </a>
      </div>
      <p className="text-[11px] text-[#94a3b8] font-mono">
        {allRowsLoaded ? (
          <>
            Đã tải {grid.rows.length.toLocaleString()} /{" "}
            {grid.records.toLocaleString()} bản ghi
          </>
        ) : (
          <>
            Chỉ có {grid.rows.length.toLocaleString()} /{" "}
            {grid.records.toLocaleString()} bản ghi — bấm Tải lại platform
          </>
        )}
        {showAllColumns ? " · tất cả cột" : ""}
      </p>
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-3">
          {createForm.title}
        </h4>
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {createForm.fields.map((field) => (
                <tr
                  key={field.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-[#94a3b8] align-top w-[40%] sm:w-[28%]">
                    {field.label}
                  </th>
                  <td className="py-2.5 px-3 text-xs text-white/90 align-top break-words">
                    <span className="text-[10px] text-[#64748b] mr-2 font-mono">
                      {field.name}
                    </span>
                    {fieldDisplayValue(field)}
                    {showAllColumns &&
                    field.type === "select" &&
                    (field.options?.length ?? 0) > 0 ? (
                      <details className="mt-2 text-[10px] text-[#94a3b8]">
                        <summary className="cursor-pointer text-[#4cceac]">
                          Xem {field.options?.length} option
                        </summary>
                        <ul className="mt-1 max-h-40 overflow-y-auto font-mono space-y-0.5 pl-2 border-l border-white/10">
                          {(field.options ?? []).map((opt) => (
                            <li key={`${field.id}-${opt.value}-${opt.label}`}>
                              {opt.value ? `${opt.value} · ` : ""}
                              {opt.label}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Danh sách ({createForm.fields.length} field form · {columns.length}{" "}
            cột)
          </h4>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#94a3b8]">
              <Button
                type="button"
                disabled={pageSafe <= 1}
                onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
              >
                Trước
              </Button>
              <span>
                {pageSafe}/{totalPages} (mỗi trang {GRID_PAGE_SIZE})
              </span>
              <Button
                type="button"
                disabled={pageSafe >= totalPages}
                onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
              >
                Sau
              </Button>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/5 max-h-[32rem] overflow-y-auto">
          <table className="w-full text-sm border-collapse min-w-[56rem]">
            <thead className="sticky top-0 bg-[#141b2d] z-10">
              <tr className="border-b border-white/10 text-left text-[#94a3b8]">
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="py-2 px-3 font-semibold whitespace-nowrap text-xs"
                  >
                    {col.label}
                  </th>
                ))}
                {enableGetCode ? (
                  <th className="py-2 px-3 font-semibold whitespace-nowrap text-xs">
                    Get Code
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rowSlice.map((row, rowIdx) => (
                <tr
                  key={String(row.id ?? `${pageSafe}-${rowIdx}`)}
                  className="border-b border-white/5 hover:bg-white/[0.03]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.name}
                      className={`py-2 px-3 align-top text-xs max-w-md break-words ${
                        col.name === nameColumn
                          ? "font-medium text-white"
                          : "font-mono text-white/80"
                      }`}
                    >
                      {cellText(row[col.name])}
                    </td>
                  ))}
                  {enableGetCode ? (
                    <td className="py-2 px-3 align-top whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={codeLoading || !row.id}
                          onClick={() =>
                            void fetchPlacementCode(String(row.id), "standard")
                          }
                          className="text-[10px] font-bold uppercase tracking-wide text-[#4cceac] hover:underline disabled:opacity-40"
                        >
                          SDK
                        </button>
                        <button
                          type="button"
                          disabled={codeLoading || !row.id}
                          onClick={() =>
                            void fetchPlacementCode(String(row.id), "rtb")
                          }
                          className="text-[10px] font-bold uppercase tracking-wide text-indigo-300 hover:underline disabled:opacity-40"
                        >
                          RTB
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {enableGetCode && (codeLoading || codeError || codeResult) ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-[#0d111a] p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4cceac]">
              Embed code
              {codeResult
                ? ` · ${codeResult.variant === "rtb" ? "Get Code RTB" : "Get Code"}`
                : ""}
            </p>
            {codeLoading ? (
              <p className="text-xs text-[#94a3b8]">
                Đang lấy code từ platform…
              </p>
            ) : null}
            {codeError ? (
              <p className="text-xs text-rose-300">{codeError}</p>
            ) : null}
            {codeResult ? (
              <>
                <p className="text-[11px] text-[#94a3b8] font-mono break-all">
                  {codeResult.sourceUrl}
                </p>
                {codeResult.meta.placementName ? (
                  <p className="text-xs text-white/80">
                    {codeResult.meta.placementName}
                    {codeResult.meta.account
                      ? ` · ${codeResult.meta.account}`
                      : ""}
                    {codeResult.meta.site ? ` · ${codeResult.meta.site}` : ""}
                    {codeResult.meta.size ? ` · ${codeResult.meta.size}` : ""}
                    {codeResult.meta.type ? ` · ${codeResult.meta.type}` : ""}
                  </p>
                ) : null}
                <pre className="max-h-64 overflow-auto text-[11px] font-mono text-white/85 leading-relaxed whitespace-pre-wrap">
                  {codeResult.code}
                </pre>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const TestData: React.FC = () => {
  const { user } = useAuth();
  const baseUrl = serverApiOrigin();
  const role = (user?.role || "").toLowerCase();
  const canEdit = role === "admin" || role === "design";

  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [compressing, setCompressing] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [videoResult, setVideoResult] = React.useState<{
    savedName: string;
    clientBytes: number;
    originalBytes: number;
    compressedBytes: number;
    videoCompressed: boolean;
  } | null>(null);
  const [downloadingVideo, setDownloadingVideo] = React.useState(false);

  const [platformLoading, setPlatformLoading] = React.useState(true);
  const [platformError, setPlatformError] = React.useState<string | null>(null);
  const [platformSnapshot, setPlatformSnapshot] =
    React.useState<PlatformTestSnapshot | null>(null);
  const [platformSavedAt, setPlatformSavedAt] = React.useState<string | null>(
    null,
  );
  const [platformSavedTo, setPlatformSavedTo] = React.useState<string | null>(
    null,
  );
  const [showPlatformJson, setShowPlatformJson] = React.useState(false);

  const [websiteNameQuery, setWebsiteNameQuery] = React.useState("");
  const [codeVariant, setCodeVariant] = React.useState<"standard" | "rtb">(
    "standard",
  );
  const [zipDownloading, setZipDownloading] = React.useState(false);
  const [zipError, setZipError] = React.useState<string | null>(null);

  const websiteNameOptions = React.useMemo(() => {
    if (!platformSnapshot) return [];
    const names = new Set<string>();
    for (const row of platformSnapshot.placement.grid.rows) {
      const w = String(row.website_name ?? "").trim();
      if (w) names.add(w);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [platformSnapshot]);

  const placementPreviewCount = React.useMemo(() => {
    const q = websiteNameQuery.trim().toLowerCase();
    if (!q || !platformSnapshot) return 0;
    return platformSnapshot.placement.grid.rows.filter((row) => {
      const w = String(row.website_name ?? "")
        .trim()
        .toLowerCase();
      return w === q || w.includes(q);
    }).length;
  }, [websiteNameQuery, platformSnapshot]);

  const handleDownloadPlacementCodesZip = async () => {
    const websiteName = websiteNameQuery.trim();
    if (!websiteName) {
      setZipError("Nhập website_name để tải code.");
      return;
    }
    setZipDownloading(true);
    setZipError(null);
    try {
      const result = await downloadPlacementCodesZip({
        websiteName,
        variant: codeVariant,
      });
      if (result.matchedCount != null) {
        setMessage(
          `Đã tải ZIP ${result.matchedCount} file embed code (${codeVariant}).`,
        );
      }
    } catch (err) {
      setZipError(
        err instanceof Error
          ? err.message
          : "Không tải được ZIP placement code",
      );
    } finally {
      setZipDownloading(false);
    }
  };

  const applyPlatformSnapshot = React.useCallback(
    (data: {
      fetchedAt: string;
      profileName: string | null;
      profileRole: string | null;
      banner: PlatformBannerPage;
      placement: PlatformPlacementPage;
      savedAt?: string;
      savedTo?: string;
    }) => {
      setPlatformSnapshot({
        fetchedAt: data.fetchedAt,
        profileName: data.profileName,
        profileRole: data.profileRole,
        banner: data.banner,
        placement: data.placement,
      });
      setPlatformSavedAt(data.savedAt ?? null);
      setPlatformSavedTo(data.savedTo ?? null);
    },
    [],
  );

  const loadPlatformFromFile = React.useCallback(async () => {
    const data = await api.testData.platformFile();
    if (!data?.ok || !data.exists || !data.banner || !data.placement) {
      return false;
    }
    applyPlatformSnapshot({
      fetchedAt: data.fetchedAt,
      profileName: data.profileName,
      profileRole: data.profileRole,
      banner: data.banner,
      placement: data.placement,
      savedAt: data.savedAt,
      savedTo: data.savedTo,
    });
    return true;
  }, [applyPlatformSnapshot]);

  const loadPlatform = React.useCallback(async () => {
    setPlatformLoading(true);
    setPlatformError(null);
    try {
      const data = await api.testData.platform();
      if (!data?.ok || !data.banner || !data.placement) {
        throw new Error("Không nhận được dữ liệu từ platform");
      }
      applyPlatformSnapshot({
        fetchedAt: data.fetchedAt,
        profileName: data.profileName,
        profileRole: data.profileRole,
        banner: data.banner,
        placement: data.placement,
        savedAt: data.savedAt,
        savedTo: data.savedTo,
      });
    } catch (err) {
      setPlatformSnapshot(null);
      setPlatformSavedAt(null);
      setPlatformSavedTo(null);
      setPlatformError(
        err instanceof Error ? err.message : "Không tải được dữ liệu platform",
      );
    } finally {
      setPlatformLoading(false);
    }
  }, [applyPlatformSnapshot]);

  const loadPlatformInitial = React.useCallback(async () => {
    setPlatformLoading(true);
    setPlatformError(null);
    try {
      const fromFile = await loadPlatformFromFile();
      if (!fromFile) {
        await loadPlatform();
        return;
      }
    } catch (err) {
      setPlatformError(
        err instanceof Error ? err.message : "Không đọc được file platform",
      );
    } finally {
      setPlatformLoading(false);
    }
  }, [loadPlatform, loadPlatformFromFile]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api.testData.get();
      if (!data?.ok) {
        throw new Error("Unable to load creative-demos.json");
      }
      setContent(
        typeof data.content === "string" ? data.content : '{"demos":[]}\n',
      );
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
    void loadPlatformInitial();
  }, [load, loadPlatformInitial]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api.testData.update(
        content == null ? "" : String(content),
      );
      if (!data?.ok) {
        throw new Error("Save failed");
      }
      setMessage("creative-demos.json saved.");
      void recordActivity({
        user,
        action: "save_test_data",
        area: "Test Data",
        description: "Saved creative-demos.json",
        target: "creative-demos.json",
      });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runVideoCompressTest = async () => {
    if (!canEdit || !videoFile) return;
    setCompressing(true);
    setVideoError(null);
    setVideoResult(null);
    const clientBytes = videoFile.size;
    if (clientBytes > MAX_VIDEO_BYTES) {
      setVideoError(
        `File exceeds ${formatFileSize(MAX_VIDEO_BYTES)} (API limit).`,
      );
      setCompressing(false);
      return;
    }
    const ext = videoFile.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = new Set(["mp4", "webm", "mov", "m4v"]);
    if (!allowed.has(ext)) {
      setVideoError("Compression test only: .mp4, .webm, .mov, .m4v");
      setCompressing(false);
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(videoFile);
      });
      const base =
        videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `video.${ext}`;
      const savedName = `compress-test-${Date.now()}-${base}`;
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        name?: string;
        error?: string;
        video?: {
          originalBytes?: number;
          compressedBytes?: number;
          videoCompressed?: boolean;
        };
      }>(`${baseUrl}/api/file-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
        },
        body: JSON.stringify({
          name: savedName,
          content: dataUrl,
          encoding: "base64",
        }),
      });
      if (!data.ok) {
        throw new Error(data.error || "Upload failed");
      }
      const v = data.video;
      setVideoResult({
        savedName: typeof data.name === "string" ? data.name : savedName,
        clientBytes,
        originalBytes:
          typeof v?.originalBytes === "number" ? v.originalBytes : clientBytes,
        compressedBytes:
          typeof v?.compressedBytes === "number"
            ? v.compressedBytes
            : clientBytes,
        videoCompressed: v?.videoCompressed === true,
      });
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCompressing(false);
    }
  };

  const downloadCompressedVideo = async () => {
    if (!canEdit || !videoResult?.savedName) return;
    setDownloadingVideo(true);
    setVideoError(null);
    try {
      const params = new URLSearchParams({ name: videoResult.savedName });
      const res = await fetchWithApiAuth(
        serverApiUrl(`/api/file-upload/file?${params}`),
      );
      if (!res.ok) {
        throw await backendErrorFromResponse(res);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = videoResult.savedName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setVideoError(
        err instanceof Error
          ? err.message
          : "Could not download file from server.",
      );
    } finally {
      setDownloadingVideo(false);
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
                Test data
              </h1>
              <p className="text-[#a3a3a3] text-xs font-medium mt-1 max-w-xl">
                Dữ liệu từ{" "}
                <a
                  href="https://platform.yomedia.vn/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#4cceac] hover:underline"
                >
                  platform.yomedia.vn
                </a>
                , chỉnh{" "}
                <span className="text-white/90">creative-demos.json</span> và
                thử nén video. Chỉ admin hoặc design được lưu JSON.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            Reload
          </Button>
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

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <GlobeAltIcon className="w-5 h-5 text-[#4cceac]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white uppercase tracking-tight italic">
                Platform YoMedia
              </h2>
              <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                Banner + Placement từ{" "}
                <a
                  href="https://platform.yomedia.vn/banner"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#4cceac] hover:underline"
                >
                  /banner
                </a>{" "}
                và{" "}
                <a
                  href="https://platform.yomedia.vn/placement"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#4cceac] hover:underline"
                >
                  /placement
                </a>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowPlatformJson((v) => !v)}
              disabled={!platformSnapshot}
              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/80 bg-white/5 hover:bg-white/10 disabled:opacity-40"
            >
              {showPlatformJson ? "Ẩn JSON" : "Xem JSON"}
            </Button>
            <Button
              type="button"
              onClick={() => void loadPlatform()}
              disabled={platformLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${platformLoading ? "animate-spin" : ""}`}
              />
              Tải lại platform
            </Button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-5">
          {platformSavedTo && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100 space-y-1">
              <p className="font-semibold">Đã lưu snapshot platform</p>
              <p className="font-mono text-[11px]">{platformSavedTo}</p>
              {platformSavedAt ? (
                <p className="text-emerald-200/80">
                  savedAt: {platformSavedAt}
                </p>
              ) : null}
            </div>
          )}
          {platformError && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-1">
              <p className="font-semibold">Không tải được dữ liệu platform</p>
              <p>{platformError}</p>
              <p className="text-amber-200/70">
                Kiểm tra `YOMEDIA_PLATFORM_USERNAME` /
                `YOMEDIA_PLATFORM_PASSWORD` trong `apps/server/.env` và restart
                server.
              </p>
            </div>
          )}
          {platformLoading && !platformSnapshot && !platformError && (
            <p className="text-sm text-[#a3a3a3] text-center py-8">
              Đang đăng nhập platform, tải banner và toàn bộ placement (có thể
              mất vài giây)…
            </p>
          )}
          {platformSnapshot && (
            <>
              <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Banner
                  </dt>
                  <dd className="text-white/90 mt-1">
                    {platformSnapshot.banner.title}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Placement
                  </dt>
                  <dd className="text-white/90 mt-1">
                    {platformSnapshot.placement.title}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Profile
                  </dt>
                  <dd className="text-white/90 mt-1">
                    {platformSnapshot.profileName ?? "—"}
                    {platformSnapshot.profileRole ? (
                      <span className="text-[#94a3b8]">
                        {" "}
                        · {platformSnapshot.profileRole}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Fetched at
                  </dt>
                  <dd className="text-white/90 mt-1 font-mono text-xs">
                    {platformSnapshot.fetchedAt}
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-white/10 bg-[#0d111a]/50 p-4 space-y-4">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4cceac]">
                    Tải placement code theo website_name
                  </h3>
                  <p className="text-[11px] text-[#94a3b8] mt-1">
                    Lọc placement theo cột{" "}
                    <code className="text-white/70">website_name</code>, gọi Get
                    Code trên platform và tải ZIP (mỗi placement một file .txt).
                  </p>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                  <label className="flex-1 min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] mb-2">
                      website_name
                    </span>
                    <input
                      type="text"
                      list="placement-website-names"
                      value={websiteNameQuery}
                      onChange={(e) => {
                        setWebsiteNameQuery(e.target.value);
                        setZipError(null);
                      }}
                      placeholder="vd: 1900.edu.vn"
                      className="w-full rounded-xl border border-white/10 bg-[#141b2d] px-3 py-2.5 text-sm text-white placeholder:text-[#64748b] outline-none focus:border-[#4cceac]/50"
                    />
                    <datalist id="placement-website-names">
                      {websiteNameOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                  <label className="shrink-0">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] mb-2">
                      Loại code
                    </span>
                    <select
                      value={codeVariant}
                      onChange={(e) =>
                        setCodeVariant(
                          e.target.value === "rtb" ? "rtb" : "standard",
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#141b2d] px-3 py-2.5 text-sm text-white min-w-[10rem]"
                    >
                      <option value="standard">Get Code (SDK)</option>
                      <option value="rtb">Get Code RTB</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    disabled={zipDownloading || placementPreviewCount === 0}
                    onClick={() => void handleDownloadPlacementCodesZip()}
                    className="inline-flex items-center justify-center gap-2 shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    {zipDownloading ? "Đang tải…" : "Download ZIP"}
                  </Button>
                </div>
                <p className="text-[11px] text-[#94a3b8] font-mono">
                  {websiteNameQuery.trim() ? (
                    <>
                      Khớp{" "}
                      <span className="text-white">
                        {placementPreviewCount.toLocaleString()}
                      </span>{" "}
                      placement trong snapshot
                      {placementPreviewCount > 300
                        ? " (tối đa 300/lần — thu hẹp tên website)"
                        : ""}
                    </>
                  ) : (
                    "Nhập website_name để xem số placement khớp."
                  )}
                </p>
                {zipError ? (
                  <p className="text-xs text-rose-300">{zipError}</p>
                ) : null}
              </div>

              <PlatformModulePanel
                heading="Banner"
                sourceUrl={platformSnapshot.banner.url}
                sourceLabel="/banner"
                createForm={platformSnapshot.banner.createForm}
                grid={platformSnapshot.banner.grid}
                nameColumn="banner_name"
              />

              <PlatformModulePanel
                heading="Placement"
                sourceUrl={platformSnapshot.placement.url}
                sourceLabel="/placement"
                createForm={platformSnapshot.placement.createForm}
                grid={platformSnapshot.placement.grid}
                nameColumn="placement_name"
                showAllColumns
                enableGetCode
              />

              {showPlatformJson && (
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-[#0d111a] p-4 text-[11px] font-mono text-white/80 leading-relaxed">
                  {JSON.stringify(platformSnapshot, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          You have read-only access. Saving changes requires admin or design
          permissions.
        </div>
      )}

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <VideoCameraIcon className="w-5 h-5 text-[#4cceac]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-white uppercase tracking-tight italic">
              Video compression test (server)
            </h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">
              Upload via{" "}
              <code className="text-white/70 text-[10px]">
                POST /api/file-upload
              </code>{" "}
              — the server runs ffmpeg and stores output under{" "}
              <code className="text-white/70 text-[10px]">
                uploads/file-center
              </code>
              . Filenames use the{" "}
              <code className="text-white/70 text-[10px]">compress-test-…</code>{" "}
              prefix.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {canEdit ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] mb-2">
                    Choose video
                  </span>
                  <input
                    type="file"
                    accept=".mp4,.webm,.mov,.m4v,video/mp4,video/webm,video/quicktime"
                    className="block w-full text-xs text-white/80 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/10 file:text-white hover:file:bg-white/15"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setVideoFile(f);
                      setVideoResult(null);
                      setVideoError(null);
                    }}
                  />
                </label>
                <Button
                  type="button"
                  disabled={!videoFile || compressing}
                  onClick={() => void runVideoCompressTest()}
                  className="shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {compressing ? "Compressing…" : "Upload & compress (test)"}
                </Button>
              </div>
              {videoFile && (
                <p className="text-[11px] text-[#94a3b8]">
                  Local file: {formatFileSize(videoFile.size)} —{" "}
                  {videoFile.name}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#a3a3a3]">
              Admin or design role required to call the upload API and see
              compression results.
            </p>
          )}
          {videoError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {videoError}
            </div>
          )}
          {videoResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-50 space-y-2">
              <p className="font-semibold text-emerald-100">
                {videoResult.videoCompressed
                  ? "Compressed and saved."
                  : "Unchanged (already small, ffmpeg error, or below shrink threshold)."}
              </p>
              <ul className="font-mono text-[11px] space-y-1 text-emerald-100/90">
                <li>
                  Saved as:{" "}
                  <span className="text-white">{videoResult.savedName}</span>
                </li>
                <li>
                  Client (original): {formatFileSize(videoResult.clientBytes)}
                </li>
                <li>
                  Server (sau decode):{" "}
                  {formatFileSize(videoResult.originalBytes)}
                </li>
                <li>
                  After processing:{" "}
                  {formatFileSize(videoResult.compressedBytes)}
                  {videoResult.originalBytes > 0 && (
                    <span className="text-emerald-200/80 ml-2">
                      (
                      {(
                        (1 -
                          videoResult.compressedBytes /
                            videoResult.originalBytes) *
                        100
                      ).toFixed(1)}
                      % vs server-decoded size)
                    </span>
                  )}
                </li>
              </ul>
              {canEdit && (
                <Button
                  type="button"
                  onClick={() => void downloadCompressedVideo()}
                  disabled={downloadingVideo}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                  {downloadingVideo
                    ? "Downloading…"
                    : "Download compressed video"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
            JSON
          </span>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canEdit || saving || loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-sm text-[#a3a3a3] text-center">
            Loading…
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={!canEdit}
            spellCheck={false}
            className="w-full min-h-[420px] bg-[#0d111a] text-white/90 text-sm font-mono leading-relaxed px-5 py-4 outline-none border-0 resize-y disabled:opacity-80"
            aria-label="creative-demos.json content"
          />
        )}
      </div>
    </div>
  );
};

export default TestData;
