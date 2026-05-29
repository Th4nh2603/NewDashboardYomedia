import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../components/Button";
import InputPopup from "../components/InputPopup";
import NoticePopup from "../components/NoticePopup";
import { useAuth } from "../contexts/AuthContext";
import brandColors from "../data/brandColors.json";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";
import { api } from "../lib/trpc/api";
import { fetchWithApiAuth } from "../lib/apiAuth";
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
  ArrowsRightLeftIcon,
  CloudArrowUpIcon,
  FolderPlusIcon,
} from "@heroicons/react/24/outline";
import {
  fetchSftpList,
  fetchSftpSearch,
  getParentPath,
  getServerBaseUrl,
  joinPath,
  type SftpBrowserScope,
  type SftpEntry,
  type SftpSearchMatch,
} from "../lib/sftpBrowser";
import { createSftpClient } from "../lib/sftpClient";
import { recordActivity } from "../lib/activityLog";

const DEFAULT_SFTP_PATH = "/script/demo";
/** UI path when connected to media SFTP (mirrors server `mapRemotePathForManageScope`). */
const MEDIA_UI_DISPLAY_ROOT = "/media";
const MANAGE_SFTP_SCOPE_STORAGE_KEY = "manageSftpScope";
const VIDEO_TARGET_MAX_BYTES = 4 * 1024 * 1024;
const VIDEO_COMPRESSIBLE_EXT = new Set(["mp4", "webm", "mov", "m4v"]);

function logicalManagePathToDisplayPath(
  logicalPath: string,
  target: SftpBrowserScope,
): string {
  if (target !== "media") return logicalPath;
  return logicalPath.replace(/^\/script\/demo(?=\/|$)/i, MEDIA_UI_DISPLAY_ROOT);
}

type ManageSftpListChrome = {
  shell: string;
  header: string;
  rowEven: string;
  rowOdd: string;
  rowHover: string;
  hostBadge: string;
};

/** Table chrome so demo vs media SFTP host is obvious at a glance. */
function getManageSftpListChrome(scope: SftpBrowserScope): ManageSftpListChrome {
  if (scope === "media") {
    return {
      shell:
        "border-violet-200/90 bg-gradient-to-b from-violet-50/85 via-white to-violet-50/50 dark:border-violet-500/30 dark:from-violet-950/40 dark:via-[#08051a] dark:to-[#0c0820]",
      header:
        "border-violet-200/90 bg-violet-50/95 text-violet-800 dark:border-violet-900/70 dark:bg-violet-950/55 dark:text-violet-200/85",
      rowEven: "bg-white/40 dark:bg-transparent",
      rowOdd: "bg-violet-50/65 dark:bg-violet-500/[0.045]",
      rowHover:
        "hover:bg-violet-100/80 dark:hover:bg-violet-500/[0.09]",
      hostBadge:
        "border-violet-300/70 bg-violet-100/90 text-violet-900 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100",
    };
  }
  return {
    shell:
      "border-cyan-200/90 bg-gradient-to-b from-cyan-50/75 via-white to-slate-50 dark:border-cyan-500/25 dark:from-cyan-950/30 dark:via-[#030a1a] dark:to-[#020617]",
    header:
      "border-cyan-200/90 bg-cyan-50/95 text-cyan-900 dark:border-cyan-900/60 dark:bg-cyan-950/45 dark:text-cyan-200/85",
    rowEven: "bg-white/50 dark:bg-transparent",
    rowOdd: "bg-cyan-50/55 dark:bg-cyan-500/[0.04]",
    rowHover: "hover:bg-cyan-100/70 dark:hover:bg-cyan-500/[0.08]",
    hostBadge:
      "border-cyan-300/70 bg-cyan-100/90 text-cyan-900 dark:border-cyan-400/35 dark:bg-cyan-500/15 dark:text-cyan-100",
  };
}

function sftpScopeQuery(scope: SftpBrowserScope): string {
  return scope === "media" ? `&scope=${encodeURIComponent("media")}` : "";
}

/** Logical path for demo→media sync (`/script/demo/...`). */
function normalizeSyncLogicalPath(path: string): string {
  const trimmed = (path || "").trim() || DEFAULT_SFTP_PATH;
  if (/^\/media(\/|$)/i.test(trimmed)) {
    return trimmed.replace(/^\/media(?=\/|$)/i, "/script/demo");
  }
  return trimmed.replace(/\/{2,}/g, "/");
}

/** year / month / brand under `/script/demo` (same layout as demo.yomedia links). */
type DemoBrandSyncContext = {
  year: string;
  month: string;
  brand: string;
  brandRootPath: string;
};

/**
 * Resolves sync target to `/script/demo/{year}/{month}/{brand}` when path is at or
 * below that brand folder (deeper paths = format/upload subfolders).
 */
function parseDemoBrandSyncContext(
  rawPath: string,
): DemoBrandSyncContext | null {
  const normalized = normalizeSyncLogicalPath(rawPath).replace(/\/+$/, "");
  const match = /^\/script\/demo\/(\d{4})\/(\d{1,2})\/([^/]+)/i.exec(normalized);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const brand = decodeURIComponent(match[3]).trim();
  if (!brand || brand === "." || brand === "..") return null;

  const brandRootPath = `/script/demo/${year}/${month}/${brand}`.replace(
    /\/{2,}/g,
    "/",
  );

  return { year, month, brand, brandRootPath };
}

function formatSyncDirectoryLabel(
  relativeKey: string,
  ctx: DemoBrandSyncContext,
): string {
  const rel = relativeKey.trim().replace(/^\/+|\/+$/g, "");
  if (!rel) {
    return `${ctx.year}/${ctx.month}/${ctx.brand}`;
  }
  return `${ctx.year}/${ctx.month}/${ctx.brand}/${rel}`;
}

type SftpManageRolePermissions = Record<
  string,
  {
    manageDemo?: {
      canSwitchSftpHost?: boolean;
      canSetupMediaSftp?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
      canSftpMkdir?: boolean;
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
          canSftpMkdir: false,
        },
      },
    });
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.permissions.get();
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
  const isAdminUser = normalizedRole === "admin";
  const canShowSftpHostSwitch =
    isAdminUser && mdSftp?.canSwitchSftpHost === true;
  const canSftpWriteFile = mdSftp?.canSftpWriteFile === true;
  const canSftpUploadBinary = mdSftp?.canSftpUploadBinary === true;
  const canSftpDelete = mdSftp?.canSftpDelete === true;
  const canSftpMkdir = mdSftp?.canSftpMkdir === true;
  const canSetupMediaSftp = mdSftp?.canSetupMediaSftp === true;
  const canDropUpload = canSftpUploadBinary && canSftpWriteFile;
  const sftpClient = React.useMemo(
    () =>
      createSftpClient({
        roleHeader: normalizedRole || undefined,
      }),
    [normalizedRole],
  );

  type ManageSftpTarget = SftpBrowserScope;
  const [manageSftpTarget, setManageSftpTarget] =
    React.useState<ManageSftpTarget>(() => {
      try {
        const raw = sessionStorage.getItem(MANAGE_SFTP_SCOPE_STORAGE_KEY);
        return raw === "media" ? "media" : "demo";
      } catch {
        return "demo";
      }
    });
  const [connectingMediaHost, setConnectingMediaHost] = React.useState(false);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(MANAGE_SFTP_SCOPE_STORAGE_KEY, manageSftpTarget);
    } catch {
      // ignore quota / private mode
    }
  }, [manageSftpTarget]);

  React.useEffect(() => {
    if (!canShowSftpHostSwitch && manageSftpTarget === "media") {
      setManageSftpTarget("demo");
    }
  }, [canShowSftpHostSwitch, manageSftpTarget]);

  const sftpScope: SftpBrowserScope =
    manageSftpTarget === "media" ? "media" : "demo";
  const sftpListChrome = React.useMemo(
    () => getManageSftpListChrome(sftpScope),
    [sftpScope],
  );
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
  const [syncBrandConfirmOpen, setSyncBrandConfirmOpen] = React.useState(false);
  const [syncOverwriteConfirmOpen, setSyncOverwriteConfirmOpen] =
    React.useState(false);
  const [syncExistingDirs, setSyncExistingDirs] = React.useState<string[]>([]);
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [syncProgressText, setSyncProgressText] = React.useState(
    "Đang đồng bộ brand lên Media SFTP…",
  );
  const syncOverwriteHandledRef = React.useRef(false);
  const [actionBanner, setActionBanner] = React.useState<string | null>(null);
  const [dragDepth, setDragDepth] = React.useState(0);
  const [isDragOverTable, setIsDragOverTable] = React.useState(false);
  const [uploadingDropFiles, setUploadingDropFiles] = React.useState(false);
  const [uploadSummary, setUploadSummary] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const filesInputRef = React.useRef<HTMLInputElement | null>(null);

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
          `${baseUrl}/api/sftp/read?path=${encodeURIComponent(fullPath)}${sftpScopeQuery(sftpScope)}`,
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
    [roleHeader, canSftpWriteFile, sftpScope],
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
            ...(sftpScope === "media" ? { scope: "media" as const } : {}),
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
  }, [filePanel, roleHeader, refreshFileQueries, canSftpWriteFile, sftpScope]);

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
            body: JSON.stringify({
              path: fullPath,
              ...(sftpScope === "media" ? { scope: "media" as const } : {}),
            }),
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
    [
      deletingPath,
      roleHeader,
      filePanel?.path,
      refreshFileQueries,
      canSftpDelete,
      sftpScope,
    ],
  );

  const handleDownloadDirectory = React.useCallback(
    async (fullPath: string) => {
      if (!fullPath || downloadingPath || !canDownloadFolders || !normalizedRole) return;
      setDownloadingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const res = await fetchWithApiAuth(
          `${baseUrl}/api/sftp/download-directory?path=${encodeURIComponent(fullPath)}${sftpScopeQuery(sftpScope)}`,
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
    [canDownloadFolders, downloadingPath, normalizedRole, roleHeader, sftpScope],
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filterQuery.trim()), 400);
    return () => window.clearTimeout(id);
  }, [filterQuery]);

  const listQuery = useQuery<SftpEntry[]>({
    queryKey: ["sftp-list", sftpPath, normalizedRole, sftpScope],
    queryFn: () =>
      fetchSftpList(
        sftpPath,
        { headers: { ...(roleHeader ?? {}) } },
        sftpScope,
      ),
  });

  const useRecursiveSearch = debouncedQ.length >= 2;
  const searchQuery = useQuery<SftpSearchMatch[]>({
    queryKey: ["sftp-search", sftpPath, debouncedQ, normalizedRole, sftpScope],
    queryFn: () =>
      fetchSftpSearch(
        sftpPath,
        debouncedQ,
        { headers: { ...(roleHeader ?? {}) } },
        sftpScope,
      ),
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

  const performCreateFolder = React.useCallback(
    async (folderName: string) => {
      if (!canSftpMkdir || creatingFolder || useRecursiveSearch) return;
      const targetPath = joinPath(sftpPath, folderName);
      setCreatingFolder(true);
      setActionBanner(null);
      try {
        const data = await sftpClient.mkdir(targetPath, {
          scope: sftpScope,
        });

        if (!data?.ok) {
          setActionBanner(data?.error || "Unable to create folder");
          return;
        }

        void recordActivity({
          user,
          action: "create_folder",
          area: "Manage SFTP",
          description: "Created folder on SFTP",
          target: targetPath,
          metadata: { scope: sftpScope },
        });
        setActionBanner("Folder created.");
        refreshFileQueries();
      } catch (err) {
        setActionBanner(
          err instanceof Error ? err.message : "Error while creating folder.",
        );
      } finally {
        setCreatingFolder(false);
      }
    },
    [
      canSftpMkdir,
      creatingFolder,
      useRecursiveSearch,
      sftpPath,
      sftpClient,
      sftpScope,
      user,
      refreshFileQueries,
    ],
  );

  const sftpPathForDisplay = React.useMemo(
    () => logicalManagePathToDisplayPath(sftpPath, sftpScope),
    [sftpPath, sftpScope],
  );

  const handleSwitchSftpHost = React.useCallback(async () => {
    if (!canShowSftpHostSwitch || listBusy || connectingMediaHost) return;
    if (manageSftpTarget === "media") {
      setManageSftpTarget("demo");
      setActionBanner(null);
      refreshFileQueries();
      return;
    }
    setConnectingMediaHost(true);
    setActionBanner(null);
    try {
      const baseUrl = getServerBaseUrl();
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        host?: string;
        error?: string;
      }>(`${baseUrl}/api/sftp/connect?scope=media`, {
        headers: { ...(roleHeader ?? {}) },
      });
      if (!data?.ok) {
        setActionBanner("Could not connect to media SFTP host.");
        return;
      }
      setManageSftpTarget("media");
      setActionBanner(
        data.host
          ? `Connected to media SFTP (${data.host}).`
          : "Connected to media SFTP host.",
      );
      refreshFileQueries();
    } catch (err) {
      setActionBanner(
        err instanceof Error
          ? err.message
          : "Could not connect to media SFTP host.",
      );
    } finally {
      setConnectingMediaHost(false);
    }
  }, [
    canShowSftpHostSwitch,
    listBusy,
    connectingMediaHost,
    manageSftpTarget,
    roleHeader,
    refreshFileQueries,
  ]);

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

  const syncBrandContext = React.useMemo(
    () => parseDemoBrandSyncContext(sftpPath),
    [sftpPath],
  );
  const syncLogicalPath = syncBrandContext?.brandRootPath ?? "";
  const syncDisplayPath = React.useMemo(
    () =>
      syncLogicalPath
        ? logicalManagePathToDisplayPath(syncLogicalPath, "media")
        : "",
    [syncLogicalPath],
  );
  const canSyncBrandToMedia = Boolean(syncBrandContext) && canSetupMediaSftp;

  const runBrandSyncCopy = React.useCallback(
    async (overwriteDirectories: string[]) => {
      if (!canSyncBrandToMedia || !syncBrandContext) return;
      const data = await sftpClient.setupDemoToMedia(syncLogicalPath, {
        skipExistingDirectories: true,
        overwriteDirectories,
      });
      if (!data?.ok) {
        setActionBanner(data?.error || "Không đồng bộ được lên media SFTP.");
        return;
      }
      const files = Number(data.copiedFiles ?? 0);
      const dirs = Number(data.copiedDirectories ?? 0);
      const skipped = Array.isArray(data.skippedDirectories)
        ? data.skippedDirectories.length
        : 0;
      const didOverwrite = overwriteDirectories.length > 0;
      setActionBanner(
        didOverwrite
          ? `Đã đồng bộ (ghi đè): ${files} file(s)${dirs > 0 ? `, ${dirs} thư mục mới` : ""}${skipped > 0 ? ` · bỏ qua ${skipped} thư mục` : ""}.`
          : `Đã đồng bộ thư mục mới: ${files} file(s)${dirs > 0 ? `, ${dirs} thư mục` : ""}${skipped > 0 ? ` · bỏ qua ${skipped} thư mục đã có` : ""}.`,
      );
      void recordActivity({
        user,
        action: "sync_brand_demo_to_media",
        area: "Manage SFTP",
        description: didOverwrite
          ? "Đồng bộ brand demo → media (có ghi đè thư mục đã tồn tại)"
          : "Đồng bộ brand demo → media (chỉ thư mục mới)",
        target: syncDisplayPath,
        metadata: {
          logicalPath: syncLogicalPath,
          year: syncBrandContext.year,
          month: syncBrandContext.month,
          brand: syncBrandContext.brand,
          copiedFiles: files,
          copiedDirectories: dirs,
          skippedDirectories: data.skippedDirectories,
          overwriteDirectories,
        },
      });
      refreshFileQueries();
    },
    [
      canSyncBrandToMedia,
      syncBrandContext,
      sftpClient,
      syncLogicalPath,
      syncDisplayPath,
      user,
      refreshFileQueries,
    ],
  );

  const startBrandSyncFlow = React.useCallback(async () => {
    if (!canSyncBrandToMedia || !syncBrandContext || syncBusy) return;
    setSyncBusy(true);
    setActionBanner(null);
    try {
      setSyncProgressText("Đang kiểm tra thư mục trên media SFTP…");
      const preview = await sftpClient.setupDemoToMedia(syncLogicalPath, {
        dryRun: true,
      });
      if (!preview?.ok) {
        setActionBanner(
          preview?.error || "Không kiểm tra được thư mục trên media.",
        );
        return;
      }
      const existing = Array.isArray(preview.existingDirectories)
        ? preview.existingDirectories
        : [];
      if (existing.length > 0) {
        setSyncExistingDirs(existing);
        setSyncOverwriteConfirmOpen(true);
        return;
      }
      setSyncProgressText("Đang copy thư mục mới lên media SFTP…");
      await runBrandSyncCopy([]);
    } catch (err) {
      setActionBanner(
        err instanceof Error
          ? err.message
          : "Không đồng bộ được lên media SFTP.",
      );
    } finally {
      setSyncBusy(false);
    }
  }, [
    canSyncBrandToMedia,
    syncBrandContext,
    syncBusy,
    sftpClient,
    syncLogicalPath,
    runBrandSyncCopy,
  ]);

  const confirmOverwriteBrandSync = React.useCallback(async () => {
    if (!canSyncBrandToMedia || syncBusy) return;
    setSyncOverwriteConfirmOpen(false);
    setSyncBusy(true);
    setActionBanner(null);
    try {
      setSyncProgressText("Đang ghi đè và đồng bộ lên media SFTP…");
      await runBrandSyncCopy(syncExistingDirs);
      setSyncExistingDirs([]);
    } catch (err) {
      setActionBanner(
        err instanceof Error
          ? err.message
          : "Không đồng bộ được lên media SFTP.",
      );
    } finally {
      setSyncBusy(false);
    }
  }, [
    canSyncBrandToMedia,
    syncBusy,
    runBrandSyncCopy,
    syncExistingDirs,
  ]);

  const syncNewDirectoriesOnly = React.useCallback(async () => {
    if (!canSyncBrandToMedia || syncBusy) return;
    setSyncOverwriteConfirmOpen(false);
    setSyncBusy(true);
    setActionBanner(null);
    try {
      setSyncProgressText("Đang copy thư mục mới lên media SFTP…");
      await runBrandSyncCopy([]);
      setSyncExistingDirs([]);
    } catch (err) {
      setActionBanner(
        err instanceof Error
          ? err.message
          : "Không đồng bộ được lên media SFTP.",
      );
    } finally {
      setSyncBusy(false);
    }
  }, [canSyncBrandToMedia, syncBusy, runBrandSyncCopy]);

  const readFileAsDataUrl = React.useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () =>
          reject(
            reader.error ?? new Error(`Unable to read file: ${file.name}`),
          );
        reader.readAsDataURL(file);
      }),
    [],
  );

  const isCompressibleVideoFileName = React.useCallback((name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    return VIDEO_COMPRESSIBLE_EXT.has(ext);
  }, []);

  const handleDropFiles = React.useCallback(
    async (files: File[]) => {
      if (!canDropUpload || uploadingDropFiles || useRecursiveSearch) return;
      const validFiles = files.filter(
        (file) => file && file.name && file.size >= 0,
      );
      if (validFiles.length === 0) return;

      setUploadingDropFiles(true);
      setUploadError(null);
      setUploadSummary(null);
      setActionBanner(null);
      try {
        const videoCompressionLogs: string[] = [];
        for (const file of validFiles) {
          const fileName = file.name.replace(/[\\/]/g, "_").trim();
          if (!fileName) continue;

          const targetPath = joinPath(sftpPath, fileName);
          const isVideoFile = isCompressibleVideoFileName(fileName);
          const data = isVideoFile
            ? await sftpClient.writeBinary(targetPath, file, {
                scope: sftpScope,
              })
            : await (async () => {
                const dataUrl = await readFileAsDataUrl(file);
                const base64 = dataUrl.includes(",")
                  ? dataUrl.split(",")[1]
                  : dataUrl;
                return sftpClient.write(
                  {
                    path: targetPath,
                    content: base64,
                    encoding: "base64",
                  },
                  { scope: sftpScope },
                );
              })();

          if (!data?.ok) {
            throw new Error(
              data?.error || `Unable to upload file: ${file.name}`,
            );
          }

          if (isVideoFile) {
            const originalBytes = Number(data.video?.originalBytes);
            const compressedBytes = Number(data.video?.compressedBytes);
            if (
              Number.isFinite(originalBytes) &&
              Number.isFinite(compressedBytes)
            ) {
              if (data.video?.videoCompressed) {
                const savedPercent =
                  originalBytes > 0
                    ? Math.max(0, (1 - compressedBytes / originalBytes) * 100)
                    : 0;
                const targetState =
                  compressedBytes <= VIDEO_TARGET_MAX_BYTES
                    ? "target <= 4MB"
                    : "still > 4MB";
                videoCompressionLogs.push(
                  `${fileName}: ${formatSizeInMb(originalBytes)} -> ${formatSizeInMb(compressedBytes)} (${savedPercent.toFixed(1)}% saved, ${targetState})`,
                );
              } else {
                videoCompressionLogs.push(
                  `${fileName}: kept original ${formatSizeInMb(originalBytes)}`,
                );
              }
            }
          }
        }

        if (videoCompressionLogs.length > 0) {
          setUploadSummary(
            `Video processing (server compress before SFTP upload): ${videoCompressionLogs.join(" | ")}`,
          );
        } else {
          setUploadSummary(
            `Uploaded ${validFiles.length} file(s) to SFTP successfully.`,
          );
        }
        void recordActivity({
          user,
          action: "upload_files",
          area: "Manage SFTP",
          description: `Uploaded ${validFiles.length} file(s) to SFTP`,
          target: sftpPath,
          metadata: {
            scope: sftpScope,
            fileCount: validFiles.length,
            files: validFiles.map((file) => file.name),
          },
        });
        refreshFileQueries();
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      } finally {
        setUploadingDropFiles(false);
      }
    },
    [
      canDropUpload,
      uploadingDropFiles,
      useRecursiveSearch,
      sftpPath,
      readFileAsDataUrl,
      isCompressibleVideoFileName,
      formatSizeInMb,
      sftpClient,
      sftpScope,
      user,
      refreshFileQueries,
    ],
  );

  const handleTableDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload || useRecursiveSearch) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth((prev) => prev + 1);
      setIsDragOverTable(true);
    },
    [canDropUpload, useRecursiveSearch],
  );

  const handleTableDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload || useRecursiveSearch) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    },
    [canDropUpload, useRecursiveSearch],
  );

  const handleTableDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload || useRecursiveSearch) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setIsDragOverTable(false);
        return next;
      });
    },
    [canDropUpload, useRecursiveSearch],
  );

  const handleTableDrop = React.useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload || useRecursiveSearch) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth(0);
      setIsDragOverTable(false);
      const droppedFiles = Array.from(event.dataTransfer.files ?? []);
      await handleDropFiles(droppedFiles);
    },
    [canDropUpload, useRecursiveSearch, handleDropFiles],
  );

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
              edit, delete, download ZIPs, or drag-and-drop files to upload into
              the current folder (when permitted).
            </p>
          </div>
          <div className="w-full sm:w-auto sm:shrink-0">
            <div
              className={`grid gap-2.5 sm:gap-3 ${canShowSftpHostSwitch ? "grid-cols-2 sm:min-w-[19rem]" : "grid-cols-1 sm:min-w-[10.5rem]"}`}
            >
              <div
                className={`flex min-w-0 flex-col justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${canShowSftpHostSwitch ? "min-h-[5.25rem]" : ""}`}
              >
                <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {sftpScope === "media" ? "Media root" : "Default root"}
                </p>
                <p className="font-mono text-[11px] font-semibold text-slate-800 break-all dark:text-white/90">
                  {logicalManagePathToDisplayPath(DEFAULT_SFTP_PATH, sftpScope)}
                </p>
              </div>
              {canShowSftpHostSwitch && (
                <div className="flex min-h-[5.25rem] min-w-0 flex-col justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    SFTP · kết nối host
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={listBusy || connectingMediaHost}
                    onClick={() => void handleSwitchSftpHost()}
                    title="Admin: chuyển giữa demo (SFTP_*) và media (SFTP_*_MEDIA)"
                    className="w-full justify-center gap-1.5 py-2 text-[11px] font-semibold normal-case tracking-normal"
                  >
                    <ArrowsRightLeftIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    {connectingMediaHost
                      ? "Đang kết nối…"
                      : manageSftpTarget === "demo"
                        ? "Kết nối Media host"
                        : "Demo host"}
                  </Button>
                </div>
              )}
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
            <div className="flex flex-wrap items-center gap-2 ml-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  sftpScope === "media" ? "bg-violet-500" : "bg-[#4cceac]"
                }`}
              />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                {useRecursiveSearch ? "Search results" : "SFTP folder"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${sftpListChrome.hostBadge}`}
              >
                {sftpScope === "media" ? "Media host" : "Demo host"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canDropUpload && !useRecursiveSearch && (
                <>
                  <input
                    ref={filesInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => {
                      const list = e.target.files;
                      if (list?.length) void handleDropFiles(Array.from(list));
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => filesInputRef.current?.click()}
                    disabled={listBusy || uploadingDropFiles}
                    variant="secondary"
                    size="md"
                    className="inline-flex items-center gap-1.5"
                    title={`Upload files to ${sftpPathForDisplay}`}
                  >
                    <CloudArrowUpIcon
                      className={`h-4 w-4 ${uploadingDropFiles ? "animate-pulse" : ""}`}
                    />
                    {uploadingDropFiles ? "Uploading…" : "Upload files"}
                  </Button>
                </>
              )}
              {canSftpMkdir && !useRecursiveSearch && (
                <Button
                  type="button"
                  onClick={() => {
                    if (!canSftpMkdir || creatingFolder || listBusy) return;
                    setCreateFolderOpen(true);
                  }}
                  disabled={creatingFolder || listBusy}
                  variant="violet"
                  size="md"
                  className="inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-violet-400/30"
                  title={`Create folder in ${sftpPathForDisplay}`}
                >
                  <FolderPlusIcon className="h-4 w-4" />
                  {creatingFolder ? "Creating…" : "Create folder"}
                </Button>
              )}
              {canSetupMediaSftp && (
                <Button
                  type="button"
                  onClick={() => setSyncBrandConfirmOpen(true)}
                  disabled={listBusy || syncBusy || !canSyncBrandToMedia}
                  variant="primary"
                  size="md"
                  className="inline-flex items-center gap-1.5"
                  title={
                    canSyncBrandToMedia
                      ? `Đồng bộ brand ${syncBrandContext?.year}/${syncBrandContext?.month}/${syncBrandContext?.brand} từ demo lên media`
                      : "Mở thư mục /script/demo/{year}/{month}/{brand} (hoặc thư mục con) để đồng bộ"
                  }
                >
                  <CloudArrowUpIcon
                    className={`h-4 w-4 ${syncBusy ? "animate-pulse" : ""}`}
                  />
                  {syncBusy ? "Đang đồng bộ…" : "Đồng bộ brand → Media"}
                </Button>
              )}
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
            {sftpPathForDisplay}
          </p>
          {canSetupMediaSftp && !syncBrandContext && (
            <p className="text-[10px] font-medium text-amber-600/90 px-1 dark:text-amber-300/80">
              Đồng bộ brand: mở đường dẫn dạng{" "}
              <span className="font-mono">/script/demo/YYYY/MM/brand</span> (hoặc
              thư mục con bên trong brand).
            </p>
          )}
          {syncBrandContext && (
            <p className="text-[10px] font-medium text-cyan-800/90 px-1 dark:text-cyan-300/80">
              Brand đồng bộ:{" "}
              <span className="font-mono font-semibold">
                {syncBrandContext.year}/{syncBrandContext.month}/
                {syncBrandContext.brand}
              </span>
              {normalizeSyncLogicalPath(sftpPath) !== syncLogicalPath ? (
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}
                  (gồm toàn bộ thư mục con, không chỉ thư mục hiện tại)
                </span>
              ) : null}
            </p>
          )}

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
          {canDropUpload && !useRecursiveSearch && (
            <p className="text-[10px] font-medium text-slate-500 px-1 dark:text-slate-400">
              Drag and drop files onto the folder list below to upload into the
              current path.
            </p>
          )}
          {uploadError && (
            <p className="text-sm text-amber-400/90 px-1">{uploadError}</p>
          )}
          {uploadSummary && !uploadError && (
            <p className="text-xs text-emerald-300/90 px-1">{uploadSummary}</p>
          )}
          {actionBanner && (
            <p
              className={`text-xs px-1 ${
                actionBanner === "File saved." ||
                actionBanner === "Deleted." ||
                actionBanner === "Folder created." ||
                actionBanner === "Folder ZIP ready." ||
                actionBanner.startsWith("Connected to media SFTP") ||
                actionBanner.startsWith("Đã đồng bộ")
                  ? "text-emerald-300/90"
                  : "text-amber-300/90"
              }`}
            >
              {actionBanner}
            </p>
          )}

          <div
            className={`relative overflow-hidden rounded-3xl border shadow-md dark:shadow-[0_14px_32px_rgba(2,6,23,0.5)] ${sftpListChrome.shell}`}
            onDragEnter={handleTableDragEnter}
            onDragOver={handleTableDragOver}
            onDragLeave={handleTableDragLeave}
            onDrop={handleTableDrop}
          >
            {canDropUpload && !useRecursiveSearch && isDragOverTable && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/88 backdrop-blur-[1px] dark:bg-[#020617]/85">
                <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-4 text-center shadow-[0_0_0_2px_rgba(34,211,238,0.15)] dark:border-cyan-400/45 dark:shadow-[0_0_0_2px_rgba(34,211,238,0.2)]">
                  <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                    Drop files here to upload
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-cyan-700 dark:text-cyan-100/80">
                    {sftpPathForDisplay}
                  </p>
                </div>
              </div>
            )}
            {canDropUpload && !useRecursiveSearch && uploadingDropFiles && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100/90 dark:bg-[#020617]/75">
                <div className="rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-xs font-semibold text-slate-800 dark:border-white/15 dark:bg-white/5 dark:text-white">
                  Uploading files…
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              {useRecursiveSearch ? (
                <div className="min-w-[560px]">
                  <div
                    className={`sticky top-0 z-10 grid grid-cols-12 border-b px-4 py-2.5 text-[11px] font-semibold backdrop-blur ${sftpListChrome.header}`}
                  >
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
                          className={`grid grid-cols-12 border-t border-slate-100/80 px-4 py-2.5 transition-colors dark:border-[#0f172a]/90 ${
                            index % 2 === 0
                              ? sftpListChrome.rowEven
                              : sftpListChrome.rowOdd
                          } ${sftpListChrome.rowHover}`}
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
                  <div
                    className={`sticky top-0 z-10 grid grid-cols-12 border-b px-4 py-2.5 text-[11px] font-semibold backdrop-blur ${sftpListChrome.header}`}
                  >
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
                            className={`grid grid-cols-12 border-t border-slate-100/80 px-4 py-2 transition-colors dark:border-[#0f172a]/90 ${
                              index % 2 === 0
                                ? sftpListChrome.rowEven
                                : sftpListChrome.rowOdd
                            } ${sftpListChrome.rowHover} ${
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

      <NoticePopup
        open={syncBrandConfirmOpen}
        onClose={() => {
          if (syncBusy) return;
          setSyncBrandConfirmOpen(false);
        }}
        title="Đồng bộ brand lên Media SFTP?"
        variant="warning"
        confirmLabel="Bắt đầu đồng bộ"
        cancelLabel="Hủy"
        onConfirm={async () => {
          setSyncBrandConfirmOpen(false);
          await startBrandSyncFlow();
        }}
      >
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300/90">
          <p>
            Server sẽ copy thư mục <strong>brand</strong> (cấu trúc{" "}
            <span className="font-mono text-xs">year/month/brand</span>) từ{" "}
            <strong>SFTP demo</strong> sang <strong>SFTP media</strong>.
          </p>
          {syncBrandContext ? (
            <ul className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.04]">
              <li>
                <span className="text-slate-500 dark:text-slate-400">Year · </span>
                <span className="font-mono font-semibold">{syncBrandContext.year}</span>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-400">Month · </span>
                <span className="font-mono font-semibold">{syncBrandContext.month}</span>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-400">Brand · </span>
                <span className="font-mono font-semibold">{syncBrandContext.brand}</span>
              </li>
            </ul>
          ) : null}
          <p className="font-mono text-xs break-all text-slate-800 dark:text-slate-200">
            Demo: {syncLogicalPath}
            <br />
            Media: {syncDisplayPath}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chỉ copy các thư mục con <strong>chưa có</strong> trên media. Thư mục
            đã tồn tại sẽ được hỏi riêng trước khi ghi đè.
          </p>
        </div>
      </NoticePopup>

      <NoticePopup
        open={syncOverwriteConfirmOpen}
        onClose={() => {
          if (syncBusy) return;
          if (syncOverwriteHandledRef.current) {
            syncOverwriteHandledRef.current = false;
            setSyncOverwriteConfirmOpen(false);
            return;
          }
          void syncNewDirectoriesOnly();
        }}
        title="Thư mục đã tồn tại trên Media"
        variant="warning"
        confirmLabel="Ghi đè các thư mục này"
        cancelLabel="Chỉ đồng bộ thư mục mới"
        onConfirm={async () => {
          syncOverwriteHandledRef.current = true;
          await confirmOverwriteBrandSync();
        }}
      >
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300/90">
          <p>
            Các thư mục sau đã có trên media SFTP. Chọn <strong>ghi đè</strong> để
            copy lại từ demo, hoặc <strong>chỉ thư mục mới</strong> để bỏ qua
            chúng.
          </p>
          <ul className="max-h-48 overflow-y-auto rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs dark:border-amber-400/20 dark:bg-amber-500/10">
            {syncBrandContext &&
              syncExistingDirs.map((rel) => (
                <li
                  key={rel || "__brand_root__"}
                  className="font-mono break-all py-0.5 text-slate-800 dark:text-amber-100/90"
                >
                  {formatSyncDirectoryLabel(rel, syncBrandContext)}
                </li>
              ))}
          </ul>
        </div>
      </NoticePopup>

      {syncBusy ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-label="Đang đồng bộ brand"
        >
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f172a]/95 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.65)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10">
              <ArrowPathIcon
                className="h-8 w-8 animate-spin text-cyan-200"
                aria-hidden
              />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200/80">
              Manage SFTP
            </p>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-white">
              Đang đồng bộ brand
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {syncProgressText}
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#4cceac] via-cyan-400 to-indigo-400" />
            </div>
          </div>
        </div>
      ) : null}

      <InputPopup
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        title="New folder"
        label="Folder name"
        submitLabel="Create"
        placeholder="folder-name"
        initialValue=""
        validate={(v) => {
          if (!v.trim()) return "Enter a folder name.";
          if (v.includes("/") || v.includes("\\") || v === "." || v === "..")
            return "Invalid folder name.";
          return null;
        }}
        onSubmit={async (folderName) => {
          await performCreateFolder(folderName);
        }}
      />
    </div>
  );
};

export default ManageSftp;
