import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../components/Button";
import NoticePopup from "../components/NoticePopup";
import { useAuth } from "../contexts/AuthContext";
import brandColors from "../data/brandColors.json";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";
import {
  FolderIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  SignalIcon,
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

function getBrandColorClass(name: string) {
  const lower = name.toLowerCase();
  const match = (
    brandColors as {
      keyword: string;
      className: string;
      match?: "start" | "any";
    }[]
  ).find((item) => {
    const kw = item.keyword.toLowerCase();
    if (!kw) return false;
    if (item.match === "start") {
      return lower.startsWith(kw);
    }
    return lower.includes(kw);
  });
  return match?.className || "text-[#e5e7eb]";
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

  const formatSizeInMb = React.useCallback((bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  const flatFiltered = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return listEntries;
    return listEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [listEntries, filterQuery]);

  const parentPath = getParentPath(sftpPath);
  const listBusy = loadingList;

  const openDirectory = (name: string) => {
    if (listBusy) return;
    const next = joinPath(sftpPath, name);
    setSftpPath(next);
    setPathDraft(next);
  };

  const openPath = (fullPath: string) => {
    if (listBusy) return;
    setSftpPath(fullPath);
    setPathDraft(fullPath);
  };

  const applyPathFromDraft = React.useCallback(() => {
    const nextPath = pathDraft.trim() || DEFAULT_SFTP_PATH;
    setSftpPath(nextPath);
    setPathDraft(nextPath);
  }, [pathDraft]);

  return (
    <div className="w-full px-4 sm:px-5 space-y-4 sm:space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730] dark:via-[#0b1730]/95 dark:to-[#102449] dark:shadow-[0_18px_36px_rgba(2,6,23,0.42)]">
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0 space-y-1.5 sm:max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-700 dark:text-cyan-300/80">
              SFTP tools
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight dark:text-[#e0e0e0]">
              Manage SFTP
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300/80">
              Browse any path, filter or search folders recursively, then read,
              edit, delete, or download ZIPs — same layout as Manage Demo, without
              live preview.
            </p>
          </div>
          <div className="w-full sm:w-auto sm:shrink-0">
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:min-w-[10.5rem]">
              <div className="flex min-w-0 flex-col justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Default root
                </p>
                <p className="font-mono text-[11px] font-semibold text-slate-800 break-all dark:text-white/90">
                  {DEFAULT_SFTP_PATH}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#0e203f]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                SFTP path
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                type="text"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyPathFromDraft();
                  }
                }}
                placeholder="/script/demo/..."
                spellCheck={false}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 dark:border-white/10 dark:bg-[#111c36] dark:text-white"
              />
              <Button
                type="button"
                onClick={applyPathFromDraft}
                disabled={listBusy}
                variant="primary"
                size="md"
                className="shrink-0 sm:self-stretch"
              >
                List
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#13284b]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                Find folder
              </label>
            </div>
            <div className="relative group">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4cceac] dark:text-slate-500 dark:group-focus-within:text-[#4cceac]/80" />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="2+ chars = recursive folder search"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 dark:border-white/10 dark:bg-[#111c36] dark:text-white"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded-lg border border-rose-400/20 bg-rose-500/10 p-1.5">
                <SignalIcon className="w-3.5 h-3.5 text-rose-300" />
              </div>
            </div>
            <p className="ml-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              Shorter query only filters names in the current directory.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pb-4 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                {useRecursiveSearch ? "Search results" : "SFTP folder"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canDownloadFolders && (
                <Button
                  type="button"
                  onClick={() => void handleDownloadDirectory(sftpPath)}
                  disabled={listBusy || downloadingPath !== null}
                  variant="secondary"
                  size="md"
                  className="inline-flex items-center gap-1.5"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {downloadingPath === sftpPath ? "Downloading…" : "Download ZIP"}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  void listQuery.refetch();
                  if (useRecursiveSearch) void searchQuery.refetch();
                  refreshFileQueries();
                }}
                disabled={listBusy}
                variant="secondary"
                size="md"
                className="inline-flex items-center gap-1.5"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${listBusy ? "animate-spin" : ""}`}
                />
                Reload
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (parentPath == null) return;
                  setSftpPath(parentPath);
                  setPathDraft(parentPath);
                }}
                disabled={parentPath == null || listBusy}
                variant="secondary"
                size="md"
              >
                Back
              </Button>
            </div>
          </div>

          <p className="text-xs font-mono text-slate-600 break-all px-1 dark:text-[#64748b]">
            {sftpPath}
          </p>

          {useRecursiveSearch && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300/80 px-1">
              Recursive &quot;{debouncedQ}&quot;
              {searchLoading ? "…" : ` · ${searchMatches.length} folder(s)`}
            </p>
          )}

          {listError && (
            <p className="text-sm text-amber-400/90 px-1">
              {listError instanceof Error ? listError.message : "SFTP list failed"}
            </p>
          )}
          {searchError && useRecursiveSearch && (
            <p className="text-sm text-amber-400/90 px-1">
              {searchError instanceof Error ? searchError.message : "Folder search failed"}
            </p>
          )}
          {panelError && !filePanel && (
            <p className="text-sm text-amber-400/90 px-1">{panelError}</p>
          )}
          {actionBanner && (
            <p
              className={`text-xs px-1 ${
                actionBanner === "File saved." ||
                actionBanner === "Deleted." ||
                actionBanner === "Folder ZIP ready."
                  ? "text-emerald-300/90"
                  : "text-amber-300/90"
              }`}
            >
              {actionBanner}
            </p>
          )}

          <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md dark:border-slate-800/90 dark:bg-gradient-to-b dark:from-[#030a1a] dark:via-[#020617] dark:to-[#020617] dark:shadow-[0_14px_32px_rgba(2,6,23,0.5)]">
            <div className="overflow-x-auto">
              {useRecursiveSearch ? (
                <div className="min-w-[560px]">
                  <div className="sticky top-0 z-10 grid grid-cols-12 border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-[11px] font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-[#020617]/95 dark:text-slate-300">
                    <div className="col-span-10">Path</div>
                    <div className="col-span-2 text-right">Open</div>
                  </div>
                  <div className="max-h-[20rem] overflow-y-auto text-[12px] text-slate-800 sm:max-h-[24rem] dark:text-[#e5e7eb]">
                    {searchLoading && searchMatches.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-500">
                        Searching folder tree…
                      </div>
                    ) : !searchLoading && searchMatches.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-600 dark:text-slate-400">
                        No folders match this search.
                      </div>
                    ) : (
                      searchMatches.map((m, index) => (
                        <div
                          key={m.fullPath}
                          className={`grid grid-cols-12 border-t border-slate-100 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:border-[#0f172a] dark:hover:bg-white/[0.04] ${
                            index % 2 === 0
                              ? "bg-transparent"
                              : "bg-slate-50/60 dark:bg-white/[0.015]"
                          }`}
                        >
                          <div className="col-span-10 min-w-0 pr-2">
                            <div className="flex items-start gap-2">
                              <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90 mt-0.5" />
                              <div className="min-w-0">
                                <p className="break-all font-mono text-[12px] text-slate-900 dark:text-[#e5e7eb]">
                                  {m.relativePath || m.matchedName}
                                </p>
                                <p className="mt-0.5 break-all font-mono text-[10px] text-slate-500 dark:text-[#64748b]">
                                  {m.fullPath}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-start justify-end">
                            <Button
                              type="button"
                              onClick={() => openPath(m.fullPath)}
                              disabled={listBusy}
                              variant="secondary"
                              size="sm"
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-[760px]">
                  <div className="sticky top-0 z-10 grid grid-cols-12 border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-[11px] font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-[#020617]/95 dark:text-slate-300">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-right">Size</div>
                    <div className="col-span-2 text-right">Modified</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  <div className="max-h-[20rem] overflow-y-auto text-[12px] text-slate-800 sm:max-h-[24rem] dark:text-[#e5e7eb]">
                    {listBusy && listEntries.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-500">
                        Loading…
                      </div>
                    ) : flatFiltered.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-600 dark:text-slate-400">
                        <p className="text-sm">
                          {listEntries.length === 0
                            ? "No entries in this directory."
                            : "No items match this filter."}
                        </p>
                      </div>
                    ) : (
                      flatFiltered.map((item, index) => {
                        const isDir = item.type === "d";
                        const fullPath = joinPath(sftpPath, item.name);
                        const ext = isDir
                          ? ""
                          : (item.name.split(".").pop()?.toLowerCase() ?? "");
                        const busyThis = panelLoadingPath === fullPath;
                        const deletingThis = deletingPath === fullPath;
                        const downloadingThis = downloadingPath === fullPath;

                        return (
                          <div
                            key={`${item.type}-${item.name}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (isDir) openDirectory(item.name);
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              if (isDir) openDirectory(item.name);
                            }}
                            className={`grid grid-cols-12 border-t border-slate-100 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-[#0f172a] dark:hover:bg-white/[0.04] ${
                              index % 2 === 0
                                ? "bg-transparent"
                                : "bg-slate-50/60 dark:bg-white/[0.015]"
                            } ${
                              isDir ? "cursor-pointer" : "cursor-default"
                            } ${listBusy ? "pointer-events-none opacity-80" : ""}`}
                          >
                            <div
                              className={`col-span-5 truncate pr-2 ${getBrandColorClass(item.name)}`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span className="truncate">{item.name}</span>
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center justify-center text-slate-500 dark:text-[#9ca3af]">
                              {isDir ? (
                                <FolderIcon className="w-4 h-4" />
                              ) : ext === "html" || ext === "htm" ? (
                                <GlobeAltIcon className="w-4 h-4" />
                              ) : ext === "js" || ext === "ts" ? (
                                <CodeBracketIcon className="w-4 h-4" />
                              ) : (
                                <DocumentTextIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="col-span-2 text-right text-slate-500 dark:text-[#9ca3af]">
                              {isDir ? "—" : formatSizeInMb(item.size)}
                            </div>
                            <div className="col-span-2 text-right text-slate-500 dark:text-[#6b7280]">
                              {item.modifyTime
                                ? new Date(item.modifyTime).toLocaleDateString(
                                    undefined,
                                    { day: "2-digit", month: "2-digit" },
                                  )
                                : "—"}
                            </div>
                            <div className="col-span-1 flex flex-wrap items-center justify-end gap-1">
                              {isDir && canDownloadFolders && (
                                <Button
                                  type="button"
                                  title="Download folder as ZIP"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDownloadDirectory(fullPath);
                                  }}
                                  disabled={
                                    listBusy ||
                                    downloadingPath !== null ||
                                    deletingThis
                                  }
                                  variant="secondary"
                                  size="icon"
                                  className="shrink-0"
                                >
                                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {!isDir && (
                                <>
                                  <Button
                                    type="button"
                                    title="Read file"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openReadOrEdit(fullPath, "read");
                                    }}
                                    disabled={listBusy || busyThis}
                                    variant="secondary"
                                    size="icon"
                                  >
                                    <EyeIcon className="w-3.5 h-3.5" />
                                  </Button>
                                  {canSftpWriteFile &&
                                    isEditableFileName(item.name) && (
                                      <Button
                                        type="button"
                                        title="Edit file"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void openReadOrEdit(fullPath, "edit");
                                        }}
                                        disabled={listBusy || busyThis}
                                        variant="iconSuccess"
                                        size="icon"
                                      >
                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                </>
                              )}
                              {canSftpDelete && (
                                <Button
                                  type="button"
                                  title={isDir ? "Delete folder" : "Delete file"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeletePath(fullPath, isDir);
                                  }}
                                  disabled={
                                    listBusy ||
                                    busyThis ||
                                    deletingThis ||
                                    downloadingThis
                                  }
                                  variant="iconDanger"
                                  size="icon"
                                  className="disabled:opacity-50"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {filePanel && (
            <div className="space-y-2.5 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-md dark:border-slate-800 dark:bg-gradient-to-b dark:from-[#030a1a] dark:to-[#020617] dark:shadow-[0_14px_34px_rgba(2,6,23,0.42)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 truncate font-mono text-xs text-slate-800 dark:text-[#e5e7eb]">
                  {filePanel.path}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {filePanel.mode === "read" &&
                    canSftpWriteFile &&
                    isEditableFileName(
                      filePanel.path.split("/").pop() || filePanel.path,
                    ) && (
                      <Button
                        type="button"
                        disabled={savingFile}
                        onClick={() =>
                          setFilePanel({ ...filePanel, mode: "edit" })
                        }
                        variant="secondary"
                        size="sm"
                      >
                        Switch to edit
                      </Button>
                    )}
                  {filePanel.mode === "edit" && canSftpWriteFile && (
                    <Button
                      type="button"
                      onClick={() => void handleSaveEditor()}
                      disabled={savingFile}
                      variant="primary"
                      size="sm"
                      className="disabled:opacity-50"
                    >
                      {savingFile ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={savingFile}
                    onClick={() => {
                      setFilePanel(null);
                      setPanelError(null);
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
              {panelError ? (
                <p className="text-sm text-amber-400/90">{panelError}</p>
              ) : null}
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
                className="min-h-[200px] w-full resize-vertical rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 outline-none focus:border-[#4cceac]/60 dark:border-slate-800 dark:bg-[#01050f] dark:text-[#e5e7eb]"
              />
            </div>
          )}
        </div>
      </div>

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
