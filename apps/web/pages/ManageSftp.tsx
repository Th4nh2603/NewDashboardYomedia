import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import Button from "../components/Button";
import NoticePopup from "../components/NoticePopup";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";
import {
  FolderIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ServerStackIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import {
  fetchSftpList,
  fetchSftpSearch,
  getParentPath,
  getServerBaseUrl,
  joinPath,
  type SftpEntry,
  type SftpSearchMatch,
} from "../lib/sftpBrowser";

const DEFAULT_SFTP_PATH = "/script/demo";

type SftpManageRolePermissions = Record<
  string,
  {
    manageDemo?: {
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
    };
    creativeShowcase?: {
      canDownload?: boolean;
    };
  }
>;

type FilePanelState =
  | {
      path: string;
      content: string;
      mode: "read" | "edit";
    }
  | null;

function resolveCreativeShowcaseDownload(
  permissions: SftpManageRolePermissions,
  roleRaw: string,
): boolean {
  const role = roleRaw.trim().toLowerCase();
  if (!role) return false;
  const forRole = permissions[role]?.creativeShowcase?.canDownload;
  if (forRole === true) return true;
  if (forRole === false) return false;
  const defaultRaw = permissions.default?.creativeShowcase?.canDownload;
  if (defaultRaw === true) return true;
  if (defaultRaw === false) return false;
  return role !== "media";
}

function buildFolderZipName(fullPath: string): string {
  const normalized = fullPath.trim().replace(/\/+$/, "");
  const baseName = normalized.split("/").filter(Boolean).pop() || "folder";
  const safeName = baseName
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeName || "folder"}.zip`;
}

function getDownloadNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() || null;
}

const ManageSftp: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const roleHeader = React.useMemo(
    () =>
      normalizedRole
        ? ({ "x-user-role": normalizedRole } as const)
        : undefined,
    [normalizedRole],
  );

  const [manageSftpPermissions, setManageSftpPermissions] =
    React.useState<SftpManageRolePermissions>({
      default: {
        manageDemo: {
          canSftpWriteFile: false,
          canSftpDelete: false,
        },
      },
    });
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          permissions?: SftpManageRolePermissions;
        }>(`${getServerBaseUrl()}/api/permissions`);
        if (!cancelled && data.permissions) setManageSftpPermissions(data.permissions);
      } catch {
        // keep default false
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const mdSftp =
    manageSftpPermissions[normalizedRole]?.manageDemo ??
    manageSftpPermissions.default?.manageDemo;
  const canSftpWriteFile = mdSftp?.canSftpWriteFile === true;
  const canSftpDelete = mdSftp?.canSftpDelete === true;
  const canDownloadFolders = React.useMemo(
    () => resolveCreativeShowcaseDownload(manageSftpPermissions, normalizedRole),
    [manageSftpPermissions, normalizedRole],
  );

  const queryClient = useQueryClient();
  const [sftpPath, setSftpPath] = React.useState(DEFAULT_SFTP_PATH);
  const [pathDraft, setPathDraft] = React.useState(DEFAULT_SFTP_PATH);
  const [filterQuery, setFilterQuery] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  const [filePanel, setFilePanel] = React.useState<FilePanelState>(null);
  const [panelLoadingPath, setPanelLoadingPath] = React.useState<string | null>(
    null,
  );
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [savingFile, setSavingFile] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    fullPath: string;
    isDir: boolean;
  } | null>(null);
  const [actionBanner, setActionBanner] = React.useState<string | null>(null);

  const isEditableFileName = React.useCallback((name: string) => {
    return /\.(html?|js|mjs|ts|css|json|txt|xml)$/i.test(name.toLowerCase());
  }, []);

  const refreshFileQueries = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["sftp-list"] });
    void queryClient.invalidateQueries({ queryKey: ["sftp-search"] });
  }, [queryClient]);

  const openReadOrEdit = React.useCallback(
    async (fullPath: string, mode: "read" | "edit") => {
      const effectiveMode =
        mode === "edit" && !canSftpWriteFile ? "read" : mode;
      setPanelError(null);
      setPanelLoadingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          content?: string;
          error?: string;
        }>(
          `${baseUrl}/api/sftp/read?path=${encodeURIComponent(fullPath)}`,
          { headers: { ...(roleHeader ?? {}) } },
        );
        if (!data?.ok) {
          setPanelError(data?.error || "Could not read file contents.");
          return;
        }
        setFilePanel({
          path: fullPath,
          content: String(data.content ?? ""),
          mode: effectiveMode,
        });
      } catch (err) {
        setPanelError(
          err instanceof Error ? err.message : "Error while reading file.",
        );
      } finally {
        setPanelLoadingPath(null);
      }
    },
    [roleHeader, canSftpWriteFile],
  );

  const handleSaveEditor = React.useCallback(async () => {
    if (!filePanel || filePanel.mode !== "edit") return;
    if (!canSftpWriteFile) return;
    setSavingFile(true);
    setPanelError(null);
    try {
      const baseUrl = getServerBaseUrl();
      const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/sftp/write`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(roleHeader ?? {}),
          },
          body: JSON.stringify({
            path: filePanel.path,
            content: filePanel.content,
          }),
        },
      );
      if (!data?.ok) {
        setPanelError(data?.error || "Could not save file.");
        return;
      }
      setActionBanner("File saved.");
      refreshFileQueries();
    } catch (err) {
      setPanelError(
        err instanceof Error ? err.message : "Error while saving file.",
      );
    } finally {
      setSavingFile(false);
    }
  }, [filePanel, roleHeader, refreshFileQueries, canSftpWriteFile]);

  const requestDeletePath = React.useCallback(
    (fullPath: string, isDir: boolean) => {
      if (!canSftpDelete) return;
      if (deletingPath) return;
      setDeleteConfirm({ fullPath, isDir });
    },
    [deletingPath, canSftpDelete],
  );

  const performDeletePath = React.useCallback(
    async (fullPath: string, isDir: boolean) => {
      if (!canSftpDelete) return;
      if (deletingPath) return;
      setDeletingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
          `${baseUrl}/api/sftp/delete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(roleHeader ?? {}),
            },
            body: JSON.stringify({ path: fullPath }),
          },
        );
        if (!data?.ok) {
          setActionBanner(data?.error || "Could not delete.");
          return;
        }
        setActionBanner("Deleted.");
        if (filePanel?.path === fullPath) setFilePanel(null);
        refreshFileQueries();
      } catch (err) {
        setActionBanner(
          err instanceof Error ? err.message : "Error while deleting.",
        );
      } finally {
        setDeletingPath(null);
      }
    },
    [deletingPath, roleHeader, filePanel?.path, refreshFileQueries, canSftpDelete],
  );

  const handleDownloadDirectory = React.useCallback(
    async (fullPath: string) => {
      if (!fullPath || downloadingPath || !canDownloadFolders || !normalizedRole) return;
      setDownloadingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const res = await fetch(
          `${baseUrl}/api/sftp/download-directory?path=${encodeURIComponent(fullPath)}`,
          { headers: { ...(roleHeader ?? {}) } },
        );
        if (!res.ok) {
          throw await backendErrorFromResponse(res);
        }
        const blob = await res.blob();
        const filename =
          getDownloadNameFromDisposition(res.headers.get("content-disposition")) ||
          buildFolderZipName(fullPath);
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);
        setActionBanner("Folder ZIP ready.");
      } catch (err) {
        setActionBanner(
          err instanceof Error ? err.message : "Error while downloading folder.",
        );
      } finally {
        setDownloadingPath(null);
      }
    },
    [canDownloadFolders, downloadingPath, normalizedRole, roleHeader],
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filterQuery.trim()), 400);
    return () => window.clearTimeout(id);
  }, [filterQuery]);

  const listQuery = useQuery<SftpEntry[]>({
    queryKey: ["sftp-list", sftpPath, normalizedRole],
    queryFn: () =>
      fetchSftpList(sftpPath, { headers: { ...(roleHeader ?? {}) } }),
  });

  const useRecursiveSearch = debouncedQ.length >= 2;
  const searchQuery = useQuery<SftpSearchMatch[]>({
    queryKey: ["sftp-search", sftpPath, debouncedQ, normalizedRole],
    queryFn: () =>
      fetchSftpSearch(sftpPath, debouncedQ, {
        headers: { ...(roleHeader ?? {}) },
      }),
    enabled: useRecursiveSearch,
  });

  const listEntries = listQuery.data ?? [];
  const searchMatches = searchQuery.data ?? [];
  const loadingList = listQuery.isFetching;
  const searchLoading = searchQuery.isFetching;
  const listError = listQuery.error;
  const searchError = searchQuery.error;

  // Filter names at current depth until recursive search kicks in (< 2 chars after debounce).
  const flatFiltered = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return listEntries;
    return listEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [listEntries, filterQuery]);

  const parentPath = getParentPath(sftpPath);

  const openDirectory = (name: string) => {
    if (loadingList) return;
    const next = joinPath(sftpPath, name);
    setSftpPath(next);
    setPathDraft(next);
  };

  const openPath = (fullPath: string) => {
    if (loadingList) return;
    setSftpPath(fullPath);
    setPathDraft(fullPath);
  };

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const shell = isDark
    ? "border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
    : "border-slate-200/90 bg-white/80 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]";
  const muted = isDark ? "text-[#94a3b8]" : "text-slate-500";
  const heading = isDark ? "text-white" : "text-slate-900";
  const subCard = isDark
    ? "border-white/[0.06] bg-[#151d2f]/90"
    : "border-slate-200/80 bg-slate-50/90";
  const field = isDark
    ? "border-white/10 bg-[#0b1220]/90 text-white placeholder:text-slate-500 focus:border-[#4cceac]/40 focus:ring-2 focus:ring-[#4cceac]/15"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/45 focus:ring-2 focus:ring-emerald-500/15";
  const iconBoxRing = isDark ? "ring-white/10" : "ring-black/[0.04]";
  const iconBoxBg = isDark ? "bg-[#4cceac]/15" : "bg-emerald-500/12";
  const dividerVia = isDark ? "via-white/10" : "via-slate-200";
  const tableSurface = isDark
    ? "border-white/[0.06] bg-[#050b14]/80"
    : "border-slate-200/90 bg-slate-50/90";
  const theadRow = isDark
    ? "border-b border-white/10 bg-gradient-to-b from-[#0f172a] to-[#0b1220]"
    : "border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50";
  const thAccent = isDark ? "text-[#6ee7c5]" : "text-emerald-700";
  const rowHover = isDark
    ? "odd:bg-white/[0.015] hover:bg-white/[0.04]"
    : "odd:bg-slate-50/60 hover:bg-slate-100/90";
  const trHoverSearch = isDark
    ? "hover:bg-white/[0.04]"
    : "hover:bg-slate-100/90";
  const monoStrong = isDark ? "text-[#e5e7eb]" : "text-slate-800";
  const monoSub = isDark ? "text-[#64748b]" : "text-slate-500";
  const cellSize = isDark ? "text-[#a3a3a3]" : "text-slate-500";
  const linkDir = isDark
    ? "text-[#7dd3fc] hover:underline"
    : "text-sky-700 hover:underline";
  const fileName = isDark ? "text-[#e5e7eb]" : "text-slate-800";
  const codeChip = isDark
    ? "rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[12px] text-[#7dd3fc]"
    : "rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[12px] text-sky-700";
  const btnSecondary = isDark
    ? "border border-white/10 bg-[#0b1220]/90 text-slate-200 hover:bg-white/[0.06] hover:border-white/15"
    : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  const badgeDemo = isDark
    ? "border-[#4cceac]/35 bg-[#4cceac]/10 text-[#4cceac]"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const accentWord = isDark ? "text-[#4cceac]" : "text-emerald-600";
  const modalShell = shell;
  const modalHeaderBg = isDark
    ? "border-white/10 bg-[#0a1628]/50"
    : "border-slate-200/80 bg-slate-50/90";
  const modalTextarea = isDark
    ? "border-white/10 bg-[#0b1220] text-[#e5e7eb] focus:border-[#4cceac]/40 read-only:focus:border-white/10"
    : "border-slate-200 bg-white text-slate-900 focus:border-emerald-500/50 read-only:focus:border-slate-200";
  const modalPathBox = isDark
    ? "border-white/[0.06] bg-black/20 text-slate-400"
    : "border-slate-200/80 bg-slate-100/80 text-slate-600";
  const errBanner = isDark
    ? "border-rose-500/25 bg-rose-500/[0.08] text-rose-100"
    : "border-rose-200 bg-rose-50 text-rose-800";
  const okBanner = isDark
    ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100"
    : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const warnBanner = isDark
    ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-100"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const chipRecursive = isDark
    ? "border-[#4cceac]/20 bg-[#4cceac]/5 text-[#7ee8cf]"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const chipFilter = isDark
    ? "border-sky-500/20 bg-sky-500/5 text-sky-200/90"
    : "border-sky-200 bg-sky-50 text-sky-800";
  const hintIdle = isDark ? "text-slate-600" : "text-slate-400";
  const openFolderBtn = isDark
    ? "border-sky-500/20 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:border-sky-400/30"
    : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100";
  const labelUpper = isDark ? "text-slate-500" : "text-slate-500";
  const divideRows = isDark ? "divide-white/[0.04]" : "divide-slate-200/60";
  const badgeFolder = isDark
    ? "border-amber-500/25 bg-amber-500/10 text-amber-200/90"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const badgeFile = isDark
    ? "border-slate-500/25 bg-slate-500/10 text-slate-300"
    : "border-slate-200 bg-slate-100 text-slate-700";
  const spinIcon = isDark ? "text-[#4cceac]/50" : "text-emerald-600/60";
  const readBtn = isDark
    ? "border-white/10 bg-white/5 text-[#7dd3fc] hover:bg-white/10"
    : "border-slate-200 bg-slate-50 text-sky-700 hover:bg-slate-100";
  const editBtn = isDark
    ? "border-[#4cceac]/25 bg-[#4cceac]/10 text-[#9ff3de] hover:bg-[#4cceac]/20"
    : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100";
  const delBtn = isDark
    ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
    : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100";
  const downloadBtn = isDark
    ? "border-sky-500/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
    : "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100";
  const listBtn = isDark
    ? "shrink-0 rounded-xl bg-[#4cceac]/20 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#c6fff0] border border-[#4cceac]/35 hover:bg-[#4cceac]/28 hover:border-[#4cceac]/45"
    : "shrink-0 rounded-xl bg-emerald-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900 border border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400";
  const modalSwitchEdit = isDark
    ? "rounded-xl border border-[#4cceac]/30 bg-[#4cceac]/15 px-4 py-2 text-xs font-semibold text-[#9ff3de] hover:bg-[#4cceac]/25"
    : "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100";
  const modalSave = isDark
    ? "rounded-xl bg-[#4cceac]/25 px-4 py-2 text-xs font-bold text-[#0f172a] hover:bg-[#4cceac]/40"
    : "rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500";
  const modalClose = `rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50 ${btnSecondary}`;
  const docIconMuted = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative overflow-hidden rounded-3xl border p-5 md:p-6 ${shell}`}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full blur-3xl opacity-50 bg-gradient-to-br from-[#4cceac]/30 to-indigo-600/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full blur-3xl opacity-35 bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/15"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badgeDemo}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4cceac] animate-pulse" />
              Demo server
            </span>
            <h1
              className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight ${heading}`}
            >
              SFTP{" "}
              <span className="bg-gradient-to-r from-[#4cceac] via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                browser
              </span>
            </h1>
            <p className={`text-sm leading-6 ${muted}`}>
              Browse, search, view, edit, delete, and download folders from SFTP.
              Demo preview shortcuts apply under{" "}
              <code className={codeChip}>{DEFAULT_SFTP_PATH}</code>.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              void listQuery.refetch();
              if (useRecursiveSearch) void searchQuery.refetch();
              refreshFileQueries();
            }}
            disabled={loadingList}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4cceac] to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#4cceac]/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
          >
            Reload
            <ArrowPathIcon
              className={`h-4 w-4 opacity-90 ${loadingList ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 space-y-4 ${shell}`}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4cceac]/90 to-teal-600/90 opacity-90"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
          <div
            className={`shrink-0 rounded-xl p-2.5 ${iconBoxBg} ring-1 ${iconBoxRing}`}
          >
            <ServerStackIcon
              className={`h-6 w-6 ${isDark ? "text-[#4cceac]" : "text-emerald-600"}`}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className={`text-lg font-black tracking-tight ${heading}`}>
              SFTP browser
            </h2>
            <p className={`text-[13px] leading-5 ${muted}`}>
              Search from the current path. Enter{" "}
              <span
                className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-800"}`}
              >
                2+ characters
              </span>{" "}
              for <span className={`${accentWord} font-semibold`}>recursive</span>{" "}
              folder search; shorter text only filters the current level.
            </p>
          </div>
        </div>

        <div className={`h-px bg-gradient-to-r from-transparent ${dividerVia} to-transparent`} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_auto]">
          <div className="space-y-1.5">
            <label
              className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${labelUpper}`}
            >
              <span className="inline-block h-1 w-1 rounded-full bg-[#4cceac]" />
              SFTP path
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const nextPath = pathDraft.trim() || DEFAULT_SFTP_PATH;
                    setSftpPath(nextPath);
                    setPathDraft(nextPath);
                  }
                }}
                placeholder="/script/demo/..."
                spellCheck={false}
                className={`min-w-0 flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-shadow ${field}`}
              />
              <Button
                type="button"
                onClick={() => {
                  const nextPath = pathDraft.trim() || DEFAULT_SFTP_PATH;
                  setSftpPath(nextPath);
                  setPathDraft(nextPath);
                }}
                disabled={loadingList}
                className={`disabled:opacity-50 transition-colors ${listBtn}`}
              >
                List
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${labelUpper}`}
            >
              <FunnelIcon className="h-3.5 w-3.5 text-[#4cceac]" />
              Find folder
            </label>
            <div className="relative group">
              <MagnifyingGlassIcon
                className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                  isDark
                    ? "text-slate-500 group-focus-within:text-[#4cceac]/80"
                    : "text-slate-400 group-focus-within:text-emerald-600"
                }`}
              />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="e.g. maxkleen (2+ chars = recursive)"
                className={`w-full rounded-xl border py-2.5 pl-11 pr-4 text-sm outline-none transition-shadow ${field}`}
              />
            </div>
          </div>
          {(parentPath != null || canDownloadFolders) && (
            <div className="flex flex-col gap-2 xl:justify-end">
              {canDownloadFolders ? (
                <Button
                  type="button"
                  onClick={() => void handleDownloadDirectory(sftpPath)}
                  disabled={loadingList || downloadingPath !== null}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition-colors disabled:opacity-50 xl:w-auto ${downloadBtn}`}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {downloadingPath === sftpPath
                    ? "Downloading…"
                    : "Download current"}
                </Button>
              ) : null}
              {parentPath != null ? (
                <Button
                  type="button"
                  onClick={() => {
                    setSftpPath(parentPath);
                    setPathDraft(parentPath);
                  }}
                  disabled={loadingList}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition-colors disabled:opacity-50 xl:w-auto ${btnSecondary}`}
                >
                  <ChevronUpIcon
                    className={`h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  />
                  Up to parent
                </Button>
              ) : null}
            </div>
          )}
        </div>

        <div
          className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${subCard}`}
        >
          <p className={`min-w-0 break-all font-mono text-[11px] ${muted}`}>
            <span className={`mr-1.5 ${muted}`}>Viewing</span>
            <span className={monoStrong}>{sftpPath}</span>
          </p>
          <div className="shrink-0 text-[10px] font-medium">
            {useRecursiveSearch ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${chipRecursive}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#4cceac] animate-pulse" />
                Recursive &quot;{debouncedQ}&quot;
                {searchLoading ? "…" : ` · ${searchMatches.length} folder(s)`}
              </span>
            ) : filterQuery.trim() ? (
              <span
                className={`inline-flex items-center rounded-lg border px-2 py-1 ${chipFilter}`}
              >
                Level filter · {flatFiltered.length}/{listEntries.length}
              </span>
            ) : (
              <span className={`hidden sm:inline ${hintIdle}`}>
                Type to filter or search
              </span>
            )}
          </div>
        </div>

        {listError && (
          <div className={`rounded-xl border px-3 py-2.5 text-xs ${errBanner}`}>
            {listError instanceof Error ? listError.message : "SFTP list failed"}
          </div>
        )}
        {searchError && useRecursiveSearch && (
          <div className={`rounded-xl border px-3 py-2.5 text-xs ${errBanner}`}>
            {searchError instanceof Error ? searchError.message : "Folder search failed"}
          </div>
        )}
        {panelError && !filePanel && (
          <div className={`rounded-xl border px-3 py-2.5 text-xs ${errBanner}`}>
            {panelError}
          </div>
        )}
        {actionBanner && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs ${
              actionBanner === "File saved." ||
              actionBanner === "Deleted." ||
              actionBanner === "Folder ZIP ready."
                ? okBanner
                : warnBanner
            }`}
          >
            {actionBanner}
          </div>
        )}

        <div
          className={`overflow-hidden rounded-xl border shadow-inner ${tableSurface}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead>
              <tr className={theadRow}>
                {useRecursiveSearch ? (
                  <>
                    <th
                      className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider ${thAccent}`}
                    >
                      Path (from root)
                    </th>
                    <th
                      className={`w-32 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider ${thAccent}`}
                    >
                      Open
                    </th>
                  </>
                ) : (
                  <>
                    <th
                      className={`px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider ${thAccent}`}
                    >
                      Name
                    </th>
                    <th
                      className={`w-24 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider ${thAccent}`}
                    >
                      Type
                    </th>
                    <th
                      className={`w-28 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-right ${thAccent}`}
                    >
                      Size
                    </th>
                    <th
                      className={`w-52 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wider text-right ${thAccent}`}
                    >
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className={`divide-y ${divideRows}`}>
              {useRecursiveSearch ? (
                searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-10 text-center"
                    >
                      <span
                        className={`inline-flex flex-col items-center gap-2 text-xs ${muted}`}
                      >
                        <ArrowPathIcon
                          className={`h-7 w-7 animate-spin ${spinIcon}`}
                        />
                        Searching folder tree…
                      </span>
                    </td>
                  </tr>
                ) : !searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className={`px-3 py-10 text-center text-xs ${muted}`}
                    >
                      No folders match this search.
                    </td>
                  </tr>
                ) : (
                  searchMatches.map((m) => (
                    <tr
                      key={m.fullPath}
                      className={`transition-colors ${trHoverSearch}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90 mt-0.5" />
                          <div className="min-w-0">
                            <p
                              className={`break-all font-mono text-[12px] ${monoStrong}`}
                            >
                              {m.relativePath || m.matchedName}
                            </p>
                            <p
                              className={`mt-0.5 break-all font-mono text-[10px] ${monoSub}`}
                            >
                              {m.fullPath}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <Button
                          type="button"
                          onClick={() => openPath(m.fullPath)}
                          disabled={loadingList}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${openFolderBtn}`}
                        >
                          Open folder
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              ) : loadingList && listEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center"
                  >
                    <span
                      className={`inline-flex flex-col items-center gap-2 text-xs ${muted}`}
                    >
                      <ArrowPathIcon
                        className={`h-7 w-7 animate-spin ${spinIcon}`}
                      />
                      Loading list…
                    </span>
                  </td>
                </tr>
              ) : flatFiltered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={`px-3 py-10 text-center text-xs ${muted}`}
                  >
                    {listEntries.length === 0
                      ? "No items yet or failed to load."
                      : "No items match this filter."}
                  </td>
                </tr>
              ) : (
                flatFiltered.map((entry) => {
                  const isDir = entry.type === "d";
                  const fullPath = joinPath(sftpPath, entry.name);
                  const busyThis = panelLoadingPath === fullPath;
                  const deletingThis = deletingPath === fullPath;
                  const downloadingThis = downloadingPath === fullPath;
                  const canEdit = !isDir && isEditableFileName(entry.name);
                  return (
                    <tr
                      key={`${entry.type}-${entry.name}`}
                      className={`transition-colors ${rowHover}`}
                    >
                      <td className="px-3 py-2.5">
                        <Button
                          type="button"
                          disabled={!isDir || loadingList}
                          onClick={() => isDir && openDirectory(entry.name)}
                          className={`inline-flex items-center gap-2 text-left ${
                            isDir
                              ? `${linkDir} cursor-pointer`
                              : `${fileName} cursor-default`
                          } disabled:opacity-60`}
                        >
                          {isDir ? (
                            <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90" />
                          ) : (
                            <DocumentIcon
                              className={`h-4 w-4 shrink-0 ${docIconMuted}`}
                            />
                          )}
                          <span className="break-all font-mono text-[12px]">
                            {entry.name}
                          </span>
                        </Button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                            isDir ? badgeFolder : badgeFile
                          }`}
                        >
                          {isDir ? "Folder" : "File"}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono text-[11px] ${cellSize}`}
                      >
                        {isDir ? "—" : entry.size.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isDir && canDownloadFolders ? (
                            <Button
                              type="button"
                              title="Download folder as ZIP"
                              disabled={
                                loadingList || downloadingPath !== null || deletingThis
                              }
                              onClick={() => void handleDownloadDirectory(fullPath)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${downloadBtn}`}
                            >
                              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                              {downloadingThis ? "Downloading…" : "Download"}
                            </Button>
                          ) : null}
                          {!isDir ? (
                            <>
                              <Button
                                type="button"
                                title="Read file contents"
                                disabled={loadingList || busyThis}
                                onClick={() => void openReadOrEdit(fullPath, "read")}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${readBtn}`}
                              >
                                <EyeIcon className="h-3.5 w-3.5" />
                                Read
                              </Button>
                              {canEdit && canSftpWriteFile ? (
                                <Button
                                  type="button"
                                  title="Edit file (text)"
                                  disabled={loadingList || busyThis}
                                  onClick={() =>
                                    void openReadOrEdit(fullPath, "edit")
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${editBtn}`}
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          {canSftpDelete ? (
                          <Button
                            type="button"
                            title={
                              isDir ? "Delete folder" : "Delete file"
                            }
                            disabled={
                              loadingList || busyThis || deletingThis || downloadingThis
                            }
                            onClick={() =>
                              requestDeletePath(fullPath, isDir)
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${delBtn}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {filePanel ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] p-4 ${
            isDark ? "bg-black/75" : "bg-slate-900/45"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-sftp-file-panel-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => {
              if (!savingFile) setFilePanel(null);
            }}
          />
          <div
            className={`relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl ring-1 ${
              isDark
                ? "shadow-black/70 ring-white/[0.05]"
                : "shadow-slate-900/15 ring-slate-200/60"
            } ${modalShell}`}
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#4cceac] via-cyan-400/90 to-violet-500/80 shrink-0" />
            <div className={`border-b px-5 py-4 ${modalHeaderBg}`}>
              <div className="flex items-center gap-2">
                {filePanel.mode === "edit" ? (
                  <PencilSquareIcon
                    className={`h-5 w-5 ${isDark ? "text-[#4cceac]" : "text-emerald-600"}`}
                    aria-hidden
                  />
                ) : (
                  <EyeIcon
                    className={`h-5 w-5 ${isDark ? "text-sky-400" : "text-sky-600"}`}
                    aria-hidden
                  />
                )}
                <h2
                  id="manage-sftp-file-panel-title"
                  className={`text-sm font-semibold tracking-tight ${heading}`}
                >
                  {filePanel.mode === "edit" ? "Edit file" : "Read file"}
                </h2>
              </div>
              <p
                className={`mt-2 break-all rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${modalPathBox}`}
              >
                {filePanel.path}
              </p>
            </div>
            {panelError ? (
              <div
                className={`mx-5 mt-3 rounded-lg border px-3 py-2 text-xs ${errBanner}`}
              >
                {panelError}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 px-5 py-3">
              <textarea
                value={filePanel.content}
                readOnly={filePanel.mode === "read"}
                onChange={(e) =>
                  filePanel.mode === "edit" &&
                  setFilePanel({
                    ...filePanel,
                    content: e.target.value,
                  })
                }
                spellCheck={false}
                className={`h-[min(60vh,520px)] w-full resize-y rounded-xl border p-3 font-mono text-xs leading-relaxed outline-none ${modalTextarea}`}
              />
            </div>
            <div
              className={`flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4 ${
                isDark ? "border-white/10" : "border-slate-200/80"
              }`}
            >
              {filePanel.mode === "read" &&
              canSftpWriteFile &&
              isEditableFileName(
                filePanel.path.split("/").pop() || filePanel.path,
              ) ? (
                <Button
                  type="button"
                  disabled={savingFile}
                  onClick={() =>
                    setFilePanel({ ...filePanel, mode: "edit" })
                  }
                  className={modalSwitchEdit}
                >
                  Switch to edit
                </Button>
              ) : null}
              {filePanel.mode === "edit" && canSftpWriteFile ? (
                <Button
                  type="button"
                  disabled={savingFile}
                  onClick={() => void handleSaveEditor()}
                  className={`${modalSave} disabled:opacity-50`}
                >
                  {savingFile ? "Saving…" : "Save"}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={savingFile}
                onClick={() => {
                  setFilePanel(null);
                  setPanelError(null);
                }}
                className={modalClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <NoticePopup
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={
          deleteConfirm?.isDir
            ? "Delete folder on SFTP?"
            : "Delete file on SFTP?"
        }
        description={deleteConfirm?.fullPath}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmButtonVariant="danger"
        onConfirm={async () => {
          const d = deleteConfirm;
          if (!d) return;
          await performDeletePath(d.fullPath, d.isDir);
        }}
      />
    </div>
  );
};

export default ManageSftp;
