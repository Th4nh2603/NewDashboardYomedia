import React from "react";
import { useAuth } from "../contexts/AuthContext";
import brandColors from "../data/brandColors.json";
import {
  PhotoIcon,
  SignalIcon,
  FolderIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  PencilIcon,
  PencilSquareIcon,
  TrashIcon,
  FolderPlusIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import {
  buildDemoRemoteRelativePath,
} from "../components/OpenDemo";
import { useDemoPreviewUrl } from "../hooks/useDemoPreviewUrl";
import {
  loadActiveCreativeDemos,
  type CreativeDemoItem,
} from "../data/creativeDemos";
import { createSftpClient, type SftpEntry } from "../lib/sftpClient";
import { fetchJsonOrThrow } from "../lib/apiError";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import Button from "../components/Button";
import NoticePopup from "../components/NoticePopup";
import InputPopup from "../components/InputPopup";

/** Align with Build Demo: Video format list uses creative-demos `fileType` VIDEO only. */
function isCreativeDemoVideoFileType(demo: CreativeDemoItem): boolean {
  return String(demo.fileType ?? "").toUpperCase() === "VIDEO";
}

function hasPortraitSize(input: string): boolean {
  const match = String(input).trim().match(/^(\d{2,4})x(\d{2,4})$/i);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return Number.isFinite(width) && Number.isFinite(height) && height > width;
}

function isVerticalCreativeDemo(demo: CreativeDemoItem): boolean {
  const title = String(demo.title ?? "").toLowerCase();
  const value = String(demo.value ?? "").toLowerCase();
  const format = String(demo.format ?? "").toLowerCase();
  if (
    title.includes("vertical") ||
    value.includes("vertical") ||
    format.includes("vertical")
  ) {
    return true;
  }
  const sizes = Array.isArray(demo.size)
    ? demo.size
    : demo.size
      ? [demo.size]
      : [];
  return sizes.some((size) => hasPortraitSize(String(size)));
}

const BASE_REMOTE_PATH = "/script/demo";
/** UI path when connected to media SFTP (mirrors server `mapRemotePathForManageScope`). */
const MEDIA_UI_DISPLAY_ROOT = "/media";
const MANAGE_DEMO_SFTP_SCOPE_STORAGE_KEY = "manageDemoSftpScope";

function getItemLabelById(
  list: { id?: string; label?: string }[],
  id: string,
) {
  const found = list.find((item) => item.id === id);
  return String(found?.label ?? found?.id ?? id ?? "").trim();
}

function logicalManagePathToDisplayPath(
  logicalPath: string,
  target: "demo" | "media",
): string {
  if (target !== "media") return logicalPath;
  return logicalPath.replace(/^\/script\/demo(?=\/|$)/i, MEDIA_UI_DISPLAY_ROOT);
}
const VIDEO_TARGET_MAX_BYTES = 4 * 1024 * 1024;
const VIDEO_COMPRESSIBLE_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
      canSwitchSftpHost?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
      canSftpDelete?: boolean;
      canSftpRename?: boolean;
      canSftpMkdir?: boolean;
    };
  }
>;

const ManageDemo: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const [permissions, setPermissions] = React.useState<RolePermissionConfig>({
    default: {
      manageDemo: {
        canUseFileActionButtons: false,
        canSwitchSftpHost: false,
        canSftpUploadBinary: false,
        canSftpWriteFile: false,
        canSftpDelete: false,
        canSftpRename: false,
        canSftpMkdir: false,
      },
    },
  });
  const md =
    permissions[normalizedRole]?.manageDemo ??
    permissions.default?.manageDemo;
  const canUseFileActionButtons =
    md?.canUseFileActionButtons === true;
  const canSftpUploadBinary = md?.canSftpUploadBinary === true;
  const canSftpWriteFile = md?.canSftpWriteFile === true;
  const canSftpDelete = md?.canSftpDelete === true;
  const canSftpRename = md?.canSftpRename === true;
  const canSftpMkdir = md?.canSftpMkdir === true;
  const canManageDemoWriteFile =
    canUseFileActionButtons && canSftpWriteFile;
  const canManageDemoDelete =
    canUseFileActionButtons && canSftpDelete;
  const canManageDemoRename =
    canUseFileActionButtons && canSftpRename;
  const canManageDemoMkdir =
    canUseFileActionButtons && canSftpMkdir;
  const canDropUpload =
    canUseFileActionButtons &&
    canSftpUploadBinary &&
    canSftpWriteFile;
  const canShowSftpHostSwitch =
    normalizedRole === "admin" &&
    (permissions[normalizedRole]?.manageDemo?.canSwitchSftpHost ?? false);
  const manageMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const id = String(i + 1).padStart(2, "0");
    return { id, label: id };
  });
  const now = new Date();
  const currentYearLabel = String(now.getFullYear());
  const currentMonthLabel = String(now.getMonth() + 1).padStart(2, "0");

  const presentYear = now.getFullYear();
  const manageYearOptions: { id: string; label: string }[] = [];
  for (let y = 2019; y <= presentYear; y++) {
    manageYearOptions.push({ id: String(y), label: String(y) });
  }

  const currentYearId =
    manageYearOptions.find(
      (y) => y.id === currentYearLabel || y.label === currentYearLabel,
    )?.id ??
    manageYearOptions[manageYearOptions.length - 1]?.id ??
    "2019";

  const currentMonthId =
    manageMonthOptions.find(
      (m) => m.id === currentMonthLabel || m.label === currentMonthLabel,
    )?.id ?? "01";

  const [listEntries, setListEntries] = React.useState<SftpEntry[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [directoryHasSizeJs, setDirectoryHasSizeJs] = React.useState<
    Record<string, boolean>
  >({});
  const [editorPath, setEditorPath] = React.useState<string | null>(null);
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [savingFile, setSavingFile] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
  const [renamingPath, setRenamingPath] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    fullPath: string;
    isDir: boolean;
  } | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<{
    fullPath: string;
    currentName: string;
  } | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [isDragOverTable, setIsDragOverTable] = React.useState(false);
  const [dragDepth, setDragDepth] = React.useState(0);
  const [uploadingDropFiles, setUploadingDropFiles] = React.useState(false);
  const [uploadSummary, setUploadSummary] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  type ManageSftpTarget = "demo" | "media";
  const [manageSftpTarget, setManageSftpTarget] =
    React.useState<ManageSftpTarget>(() => {
      try {
        const raw = sessionStorage.getItem(MANAGE_DEMO_SFTP_SCOPE_STORAGE_KEY);
        return raw === "media" ? "media" : "demo";
      } catch {
        return "demo";
      }
    });

  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        MANAGE_DEMO_SFTP_SCOPE_STORAGE_KEY,
        manageSftpTarget,
      );
    } catch {
      // ignore quota / private mode
    }
  }, [manageSftpTarget]);

  React.useEffect(() => {
    if (!canShowSftpHostSwitch && manageSftpTarget === "media") {
      setManageSftpTarget("demo");
    }
  }, [canShowSftpHostSwitch, manageSftpTarget]);
  const baseUrl = serverApiOrigin();
  const sftpScope = manageSftpTarget === "media" ? "media" : "demo";
  const sftpClient = React.useMemo(
    () =>
      createSftpClient({
        roleHeader: normalizedRole || undefined,
      }),
    [normalizedRole],
  );

  const [activeDemos, setActiveDemos] = React.useState<CreativeDemoItem[]>([]);
  const [demosCatalogReady, setDemosCatalogReady] = React.useState(false);

  type FormatSelectOption = { value: string; label: string };
  type ManageDemoCategory = "Mobile" | "Display" | "Video";
  const [config, setConfig] = React.useState({
    quality: currentYearId,
    mode: currentMonthId,
    formatValue: "",
    category: "Mobile" as ManageDemoCategory,
  });

  const demoPaths = React.useMemo(() => {
    const year = getItemLabelById(manageYearOptions, config.quality);
    const month = getItemLabelById(manageMonthOptions, config.mode).padStart(
      2,
      "0",
    );
    const pathYearMonth = `${BASE_REMOTE_PATH}/${year}/${month}`.replace(
      /\/{2,}/g,
      "/",
    );
    return { pathYearMonth, month };
  }, [config.quality, config.mode, manageYearOptions, manageMonthOptions]);

  const [currentPath, setCurrentPath] = React.useState<string>(
    demoPaths.pathYearMonth,
  );

  React.useEffect(() => {
    setCurrentPath(demoPaths.pathYearMonth);
  }, [demoPaths.pathYearMonth]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const demos = await loadActiveCreativeDemos();
        if (!cancelled) setActiveDemos(demos);
      } catch {
        if (!cancelled) setActiveDemos([]);
      } finally {
        if (!cancelled) setDemosCatalogReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          permissions?: RolePermissionConfig;
        }>(`${baseUrl}/api/permissions`);
        if (!cancelled && data?.permissions) {
          setPermissions(data.permissions);
        }
      } catch {
        if (!cancelled) {
          setPermissions({
            default: {
              manageDemo: {
                canUseFileActionButtons: false,
                canSwitchSftpHost: false,
                canSftpUploadBinary: false,
                canSftpWriteFile: false,
                canSftpDelete: false,
                canSftpRename: false,
                canSftpMkdir: false,
              },
            },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const detectedSizes = React.useMemo(() => {
    const sizeRegex = /(\d{2,4})x(\d{2,4})/gi;
    const detected = new Set<string>();
    const collect = (input: string) => {
      for (const match of input.matchAll(sizeRegex)) {
        detected.add(`${match[1]}x${match[2]}`.toLowerCase());
      }
    };
    collect(currentPath);
    listEntries.forEach((entry) => collect(entry.name));
    return detected;
  }, [currentPath, listEntries]);

  const listingHasMakeVastXml = React.useMemo(
    () =>
      listEntries.some(
        (e) =>
          e.type !== "d" &&
          e.name.trim().toLowerCase() === "make-vast.xml",
      ),
    [listEntries],
  );

  const demoMatchesDetectedSize = React.useCallback(
    (demo: CreativeDemoItem) => {
      const sizes = Array.isArray(demo.size)
        ? demo.size
        : demo.size
          ? [demo.size]
          : [];
      return sizes.some((s) =>
        detectedSizes.has(String(s).trim().toLowerCase()),
      );
    },
    [detectedSizes],
  );

  const formatSelectOptions = React.useMemo(() => {
    const filteredDemos = activeDemos.filter((demo) => {
      if (demo.category !== config.category) return false;
      if (demo.category === "Video") {
        if (!isCreativeDemoVideoFileType(demo)) return false;
        // Video formats are value-driven (e.g. instream), not strict size-driven.
        // Keep all active VIDEO entries visible so valid options like 0080 are not hidden
        // when the current folder contains a different detected size.
        return true;
      }
      return demoMatchesDetectedSize(demo);
    });

    const byValue = new Map<string, CreativeDemoItem[]>();
    for (const d of filteredDemos) {
      const key =
        d.category === "Video"
          ? String(d.value ?? "").trim()
          : d.format
            ? String(d.format).trim()
            : "";
      if (!key) continue;
      const list = byValue.get(key) ?? [];
      list.push(d);
      byValue.set(key, list);
    }

    const options: FormatSelectOption[] = Array.from(
      byValue.entries(),
      ([value, demos]) => {
        const titles = demos
          .map((item) => String(item.title ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        const title = titles[0] ?? value;
        const hasVerticalFormat =
          config.category === "Video" &&
          demos.some((item) => isVerticalCreativeDemo(item));
        const labelBase =
          title && title !== value ? `${title} · ${value}` : value;
        const label = hasVerticalFormat ? `${labelBase} · vertical` : labelBase;
        return { value, label };
      },
    );
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [
    activeDemos,
    config.category,
    demoMatchesDetectedSize,
  ]);

  const autoDetectedCategory = React.useMemo<ManageDemoCategory | null>(() => {
    if (listingHasMakeVastXml) return "Video";

    const matchedCategories = new Set<ManageDemoCategory>();
    activeDemos.forEach((demo) => {
      const sizes = Array.isArray(demo.size)
        ? demo.size
        : demo.size
          ? [demo.size]
          : [];
      const hasMatchedSize = sizes.some((s) =>
        detectedSizes.has(String(s).trim().toLowerCase()),
      );
      if (!hasMatchedSize) return;
      if (demo.category === "Video" && !isCreativeDemoVideoFileType(demo)) {
        return;
      }
      if (
        demo.category === "Mobile" ||
        demo.category === "Display" ||
        demo.category === "Video"
      ) {
        matchedCategories.add(demo.category);
      }
    });

    if (
      matchedCategories.has("Mobile") &&
      !matchedCategories.has("Display") &&
      !matchedCategories.has("Video")
    ) {
      return "Mobile";
    }
    if (
      matchedCategories.has("Display") &&
      !matchedCategories.has("Mobile") &&
      !matchedCategories.has("Video")
    ) {
      return "Display";
    }
    if (
      matchedCategories.has("Video") &&
      !matchedCategories.has("Mobile") &&
      !matchedCategories.has("Display")
    ) {
      return "Video";
    }
    if (matchedCategories.has(config.category)) return config.category;
    return null;
  }, [
    activeDemos,
    detectedSizes,
    config.category,
    listingHasMakeVastXml,
  ]);

  React.useEffect(() => {
    if (!autoDetectedCategory) return;
    if (config.category === autoDetectedCategory) return;
    setConfig((prev) => ({ ...prev, category: autoDetectedCategory }));
  }, [autoDetectedCategory, config.category]);

  React.useEffect(() => {
    if (autoDetectedCategory !== "Video") return;
    const firstOption = formatSelectOptions[0];
    if (!firstOption) return;

    setConfig((prev) =>
      prev.formatValue === firstOption.value
        ? prev
        : { ...prev, formatValue: firstOption.value },
    );
  }, [autoDetectedCategory, formatSelectOptions]);

  React.useEffect(() => {
    if (
      config.formatValue &&
      !formatSelectOptions.some((o) => o.value === config.formatValue)
    ) {
      setConfig((prev) => ({ ...prev, formatValue: "" }));
    }
  }, [config.formatValue, formatSelectOptions]);

  const { previewUrl, resolvingPreview } = useDemoPreviewUrl({
    remotePath: currentPath,
    formatValue: config.formatValue || undefined,
    category: config.category,
    listingHasMakeVastXml,
    demosCatalogReady,
    activeDemos,
    baseRemotePath: BASE_REMOTE_PATH,
    serverApiUrl: baseUrl,
  });

  const displayRemotePath = React.useCallback(
    (logicalPath: string) =>
      logicalManagePathToDisplayPath(logicalPath, manageSftpTarget),
    [manageSftpTarget],
  );

  const currentPathForDisplay = React.useMemo(
    () => displayRemotePath(currentPath),
    [currentPath, displayRemotePath],
  );

  const pathForDisplay = currentPathForDisplay.replace(
    /(\/(?:media|script\/demo)\/)\d{4}(\/)/,
    "$1…$2",
  );

  const buildEntryFullPath = React.useCallback(
    (entryName: string, basePath: string) => {
      const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
      return base === "/" ? `/${entryName}` : `${base}/${entryName}`;
    },
    [],
  );

  const getParentPath = React.useCallback((path: string) => {
    const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
    if (trimmed === "/" || trimmed === BASE_REMOTE_PATH) return null;
    const lastSlash = trimmed.lastIndexOf("/");
    if (lastSlash <= 0) return "/";
    return trimmed.slice(0, lastSlash) || "/";
  }, []);

  /** Parent for SFTP browsing only: stop at year folder (/script/demo/YYYY), do not allow /script/demo. */
  const getSftpBrowsingParentPath = React.useCallback(
    (path: string) => {
      const parent = getParentPath(path);
      if (!parent || parent === BASE_REMOTE_PATH) return null;
      return parent;
    },
    [getParentPath],
  );

  const navigateToPath = React.useCallback(
    (nextPath: string) => {
      if (!nextPath || nextPath === currentPath) return;
      if (loadingList || isNavigating) return;
      setIsNavigating(true);
      setCurrentPath(nextPath);
    },
    [currentPath, loadingList, isNavigating],
  );

  const openRemoteMedia = React.useCallback((fullPath: string) => {
    const relative = buildDemoRemoteRelativePath(fullPath, BASE_REMOTE_PATH);
    const baseUrl = "https://demo.yomedia.vn";
    const url = relative ? `${baseUrl}/${encodeURI(relative)}` : baseUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const openCurrentDemo = React.useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [previewUrl]);

  const getBrandColorClass = (name: string) => {
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
  };

  const formatSizeInMb = React.useCallback((bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  React.useEffect(() => {
    const pathToList = currentPath;
    let cancelled = false;
    setLoadingList(true);
    setListError(null);
    const sortEntries = (list: SftpEntry[]) =>
      list
        .filter((e) => !e.name.startsWith(".") && !e.name.startsWith(".bash"))
        .slice()
        .sort((a, b) => {
          const isDirA = a.type === "d";
          const isDirB = b.type === "d";
          if (isDirA && !isDirB) return -1;
          if (!isDirA && isDirB) return 1;
          return a.name.localeCompare(b.name);
        });

    void (async () => {
      try {
        const data = await sftpClient.list(pathToList, { scope: sftpScope });
        if (!data.ok) {
          throw new Error(data.error || `Unable to list ${pathToList}`);
        }
        const entries = sortEntries((data.entries as SftpEntry[]) ?? []);
        if (cancelled) return;
        setListEntries(entries);
        setListError(null);
      } catch (err) {
        if (!cancelled) {
          setListEntries([]);
          setListError(
            err instanceof Error ? err.message : "Unknown network error",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
          setIsNavigating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    currentPath,
    reloadTick,
    sftpScope,
    sftpClient,
  ]);

  React.useEffect(() => {
    const dirs = listEntries.filter((entry) => entry.type === "d");
    if (dirs.length === 0) {
      setDirectoryHasSizeJs({});
      return;
    }

    let cancelled = false;
    const sizeJsRegex = /^\d{2,4}x\d{2,4}\.js$/i;

    void (async () => {
      const checks = await Promise.all(
        dirs.map(async (dir) => {
          const fullPath = buildEntryFullPath(dir.name, currentPath);
          try {
            const data = await sftpClient.list(fullPath, { scope: sftpScope });
            if (!data?.ok || !Array.isArray(data?.entries)) {
              return [fullPath, false] as const;
            }
            const expectedByDirName = `${String(dir.name).toLowerCase()}.js`;
            const hasSizeJs = (data.entries as SftpEntry[]).some((entry) => {
              if (entry.type === "d") return false;
              const fileName = String(entry.name ?? "").toLowerCase();
              return (
                sizeJsRegex.test(fileName) || fileName === expectedByDirName
              );
            });
            return [fullPath, hasSizeJs] as const;
          } catch {
            return [fullPath, false] as const;
          }
        }),
      );

      if (cancelled) return;
      setDirectoryHasSizeJs(Object.fromEntries(checks));
    })();

    return () => {
      cancelled = true;
    };
  }, [
    listEntries,
    currentPath,
    buildEntryFullPath,
    sftpScope,
    sftpClient,
  ]);

  const listBusy = loadingList || isNavigating;

  const isEditableFileName = React.useCallback((name: string) => {
    const lower = name.toLowerCase();
    return /\.(html?|js|mjs|ts|css|json|txt|xml)$/i.test(lower);
  }, []);

  const handleOpenEditor = React.useCallback(
    async (fullPath: string) => {
      try {
        const data = await sftpClient.read(fullPath, { scope: sftpScope });
        if (!data?.ok) {
          setListError(data?.error || "Unable to read file content");
          return;
        }
        setEditorPath(fullPath);
        setEditorContent(String(data.content ?? ""));
        setListError(null);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      }
    },
    [sftpClient, sftpScope],
  );

  const handleSaveEditor = React.useCallback(async () => {
    if (!editorPath || !canManageDemoWriteFile) return;
    setSavingFile(true);
    try {
      const data = await sftpClient.write(
        {
          path: editorPath,
          content: editorContent,
        },
        { scope: sftpScope },
      );
      if (!data?.ok) {
        setListError(data?.error || "Unable to save file");
        return;
      }
      setListError(null);
      setReloadTick((prev) => prev + 1);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unknown network error",
      );
    } finally {
      setSavingFile(false);
    }
  }, [
    editorPath,
    editorContent,
    canManageDemoWriteFile,
    sftpClient,
    sftpScope,
  ]);

  const requestDeletePath = React.useCallback(
    (fullPath: string, isDir: boolean) => {
      if (!canManageDemoDelete || deletingPath) return;
      setDeleteConfirm({ fullPath, isDir });
    },
    [canManageDemoDelete, deletingPath],
  );

  const performDeletePath = React.useCallback(
    async (fullPath: string, isDir: boolean) => {
      if (!canManageDemoDelete || deletingPath) return;
      setDeletingPath(fullPath);
      try {
        const data = await sftpClient.remove(fullPath, { scope: sftpScope });
        if (!data?.ok) {
          setListError(data?.error || "Unable to delete path");
          return;
        }
        setListEntries((prev) =>
          prev.filter(
            (entry) => buildEntryFullPath(entry.name, currentPath) !== fullPath,
          ),
        );
        setListError(null);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      } finally {
        setDeletingPath(null);
      }
    },
    [
      canManageDemoDelete,
      deletingPath,
      sftpClient,
      sftpScope,
      buildEntryFullPath,
      currentPath,
    ],
  );

  const requestRenamePath = React.useCallback(
    (fullPath: string, currentName: string) => {
      if (!canManageDemoRename || renamingPath) return;
      setRenameTarget({ fullPath, currentName });
    },
    [canManageDemoRename, renamingPath],
  );

  const performRenamePath = React.useCallback(
    async (fullPath: string, nextName: string) => {
      if (!canManageDemoRename || renamingPath) return;
      const parent = getParentPath(fullPath) || "/";
      const targetPath = buildEntryFullPath(nextName, parent);
      setRenamingPath(fullPath);
      try {
        const data = await sftpClient.rename(fullPath, targetPath, {
          scope: sftpScope,
        });
        if (!data?.ok) {
          setListError(data?.error || "Unable to rename path");
          return;
        }
        setListError(null);
        setReloadTick((prev) => prev + 1);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      } finally {
        setRenamingPath(null);
      }
    },
    [
      canManageDemoRename,
      renamingPath,
      getParentPath,
      buildEntryFullPath,
      sftpClient,
      sftpScope,
    ],
  );

  const performCreateFolder = React.useCallback(
    async (folderName: string) => {
      if (!canManageDemoMkdir || creatingFolder) return;
      const targetPath = buildEntryFullPath(folderName, currentPath);
      setCreatingFolder(true);
      try {
        const data = await sftpClient.mkdir(targetPath, {
          scope: sftpScope,
        });

        if (!data?.ok) {
          setListError(data?.error || "Unable to create folder");
          return;
        }

        setListError(null);
        setReloadTick((prev) => prev + 1);
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      } finally {
        setCreatingFolder(false);
      }
    },
    [
      canManageDemoMkdir,
      creatingFolder,
      buildEntryFullPath,
      currentPath,
      sftpClient,
      sftpScope,
    ],
  );

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
      if (!canDropUpload || uploadingDropFiles) return;
      const validFiles = files.filter(
        (file) => file && file.name && file.size >= 0,
      );
      if (validFiles.length === 0) return;

      setUploadingDropFiles(true);
      setListError(null);
      setUploadSummary(null);
      try {
        const videoCompressionLogs: string[] = [];
        for (const file of validFiles) {
          const fileName = file.name.replace(/[\\/]/g, "_").trim();
          if (!fileName) continue;

          const targetPath = buildEntryFullPath(fileName, currentPath);
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

        setReloadTick((prev) => prev + 1);
        if (videoCompressionLogs.length > 0) {
          setUploadSummary(
            `Video processing (server compress before SFTP upload): ${videoCompressionLogs.join(" | ")}`,
          );
        } else {
          setUploadSummary(
            `Uploaded ${validFiles.length} file(s) to SFTP successfully.`,
          );
        }
      } catch (err) {
        setListError(
          err instanceof Error ? err.message : "Unknown network error",
        );
      } finally {
        setUploadingDropFiles(false);
      }
    },
    [
      canDropUpload,
      uploadingDropFiles,
      buildEntryFullPath,
      currentPath,
      readFileAsDataUrl,
      isCompressibleVideoFileName,
      formatSizeInMb,
      sftpClient,
      sftpScope,
    ],
  );

  const handleTableDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth((prev) => prev + 1);
      setIsDragOverTable(true);
    },
    [canDropUpload],
  );

  const handleTableDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    },
    [canDropUpload],
  );

  const handleTableDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setIsDragOverTable(false);
        return next;
      });
    },
    [canDropUpload],
  );

  const handleTableDrop = React.useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!canDropUpload) return;
      event.preventDefault();
      event.stopPropagation();
      setDragDepth(0);
      setIsDragOverTable(false);
      const droppedFiles = Array.from(event.dataTransfer.files ?? []);
      await handleDropFiles(droppedFiles);
    },
    [canDropUpload, handleDropFiles],
  );

  return (
    <div className="w-full px-4 sm:px-5 space-y-4 sm:space-y-5">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730] dark:via-[#0b1730]/95 dark:to-[#102449] dark:shadow-[0_18px_36px_rgba(2,6,23,0.42)]">
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0 space-y-1.5 sm:max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-700 dark:text-cyan-300/80">
              SFTP demo manager
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight dark:text-[#e0e0e0]">
              Manage Demo
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300/80">
              Browse demo assets, preview quickly, and edit production files
              with stronger visual clarity.
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
                  Current month
                </p>
                <p className="text-lg font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {getItemLabelById(manageYearOptions, config.quality)}
                  <span className="text-slate-400 dark:text-white/35">/</span>
                  {demoPaths.month}
                </p>
              </div>
              {canShowSftpHostSwitch && (
                <div className="flex min-h-[5.25rem] min-w-0 flex-col justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    SFTP · switch host
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={loadingList || isNavigating}
                    onClick={() =>
                      setManageSftpTarget((t) =>
                        t === "demo" ? "media" : "demo",
                      )
                    }
                    title="Admin: switch between demo (SFTP_*) and media (SFTP_*_MEDIA)"
                    className="w-full justify-center gap-1.5 py-2 text-[11px] font-semibold normal-case tracking-normal"
                  >
                    <ArrowsRightLeftIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    {manageSftpTarget === "demo" ? "Demo host" : "Media host"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(560px,760px)_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#0e203f]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                  Year
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.quality}
                  onChange={(e) =>
                    setConfig({ ...config, quality: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 appearance-none cursor-pointer dark:border-white/10 dark:bg-[#111c36] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  {manageYearOptions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-1.5">
                  <PhotoIcon className="w-3.5 h-3.5 text-indigo-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#13284b]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                  Month
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.mode}
                  onChange={(e) =>
                    setConfig({ ...config, mode: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 appearance-none cursor-pointer dark:border-white/10 dark:bg-[#111c36] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  {manageMonthOptions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded-lg border border-rose-400/20 bg-rose-500/10 p-1.5">
                  <SignalIcon className="w-3.5 h-3.5 text-rose-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm md:col-span-2 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#10283f]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center justify-between gap-2 ml-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                  <div className="min-w-0">
                    <label
                      htmlFor="manage-demo-format"
                      className="block text-[9px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400"
                    >
                      Format
                    </label>
                    <span className="block text-[10px] font-medium leading-tight text-slate-400 dark:text-slate-500 normal-case tracking-normal mt-0.5">
                      By creative title · value for preview
                      {config.category === "Video"
                        ? " · add vertical when detected"
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <select
                  id="manage-demo-format"
                  value={config.formatValue}
                  onChange={(e) =>
                    setConfig({ ...config, formatValue: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm font-semibold leading-snug tracking-wide text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 appearance-none cursor-pointer dark:border-white/10 dark:bg-[#111c36] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  <option
                    value=""
                    className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                  >
                    Auto detect · from folder & catalogue
                  </option>
                  {formatSelectOptions.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                      className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-1.5">
                  <CodeBracketIcon className="w-3.5 h-3.5 text-emerald-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-sm md:col-span-2 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1730]/80 dark:to-[#10283f]/75 dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                  Category
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.category}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      category: e.target.value as ManageDemoCategory,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 appearance-none cursor-pointer dark:border-white/10 dark:bg-[#111c36] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  <option
                    value="Mobile"
                    className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                  >
                    Mobile
                  </option>
                  <option
                    value="Display"
                    className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                  >
                    Display
                  </option>
                  <option
                    value="Video"
                    className="bg-white text-slate-900 dark:bg-[#0b1730] dark:text-white"
                  >
                    Video
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pb-4 sm:pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                  SFTP folder
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canManageDemoMkdir && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (
                        !canManageDemoMkdir ||
                        creatingFolder ||
                        listBusy
                      )
                        return;
                      setCreateFolderOpen(true);
                    }}
                    disabled={creatingFolder || listBusy}
                    variant="violet"
                    size="md"
                    className="inline-flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-violet-400/30"
                  >
                    <FolderPlusIcon className="h-4 w-4" />
                    {creatingFolder ? "Creating..." : "Create folder"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    const parent = getSftpBrowsingParentPath(currentPath);
                    if (parent) navigateToPath(parent);
                  }}
                  disabled={!getSftpBrowsingParentPath(currentPath) || listBusy}
                  variant="secondary"
                  size="md"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={openCurrentDemo}
                  disabled={!previewUrl}
                  variant="primary"
                  size="md"
                >
                  Open demo
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#94a3b8]">
                Month · {demoPaths.month}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-600 break-all px-1 dark:text-[#64748b]">
              {pathForDisplay}
            </p>
            {listError && (
              <p className="text-sm text-amber-400/90 px-1">{listError}</p>
            )}
            {uploadSummary && !listError && (
              <p className="text-xs text-emerald-300/90 px-1">
                {uploadSummary}
              </p>
            )}
            <div
              className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md dark:border-slate-800/90 dark:bg-gradient-to-b dark:from-[#030a1a] dark:via-[#020617] dark:to-[#020617] dark:shadow-[0_14px_32px_rgba(2,6,23,0.5)]"
              onDragEnter={handleTableDragEnter}
              onDragOver={handleTableDragOver}
              onDragLeave={handleTableDragLeave}
              onDrop={handleTableDrop}
            >
              {canDropUpload && isDragOverTable && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/88 backdrop-blur-[1px] dark:bg-[#020617]/85">
                  <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-4 text-center shadow-[0_0_0_2px_rgba(34,211,238,0.15)] dark:border-cyan-400/45 dark:shadow-[0_0_0_2px_rgba(34,211,238,0.2)]">
                    <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                      Drop files here to upload
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] text-cyan-700 dark:text-cyan-100/80">
                      {currentPathForDisplay}
                    </p>
                  </div>
                </div>
              )}
              {canDropUpload && uploadingDropFiles && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100/90 dark:bg-[#020617]/75">
                  <div className="rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-xs font-semibold text-slate-800 dark:border-white/15 dark:bg-white/5 dark:text-white">
                    Uploading files...
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="sticky top-0 z-10 grid grid-cols-12 border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 text-[11px] font-semibold text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-[#020617]/95 dark:text-slate-300">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-right">Size</div>
                    <div className="col-span-2 text-right">Modified</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  <div className="max-h-[20rem] overflow-y-auto text-[12px] text-slate-800 sm:max-h-[24rem] dark:text-[#e5e7eb]">
                    {loadingList && listEntries.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-500">
                        Loading…
                      </div>
                    ) : listEntries.length === 0 ? (
                      <div className="space-y-3 px-4 py-10 text-center text-slate-600 dark:text-slate-400">
                        <p className="text-sm">No entries in this directory.</p>
                        {currentPath !== demoPaths.pathYearMonth && (
                          <Button
                            type="button"
                            onClick={() =>
                              navigateToPath(demoPaths.pathYearMonth)
                            }
                            disabled={listBusy}
                            variant="secondary"
                            size="md"
                          >
                            Return to month root
                          </Button>
                        )}
                      </div>
                    ) : (
                      listEntries.map((item, index) => {
                        const isDir = item.type === "d";
                        const fullPath = buildEntryFullPath(
                          item.name,
                          currentPath,
                        );
                        const ext = isDir
                          ? ""
                          : (item.name.split(".").pop()?.toLowerCase() ?? "");

                        return (
                          <div
                            key={fullPath}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (isDir) {
                                navigateToPath(fullPath);
                              }
                            }}
                            onDoubleClick={() => {
                              if (!isDir) {
                                openRemoteMedia(fullPath);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              if (isDir) {
                                navigateToPath(fullPath);
                                return;
                              }
                              openRemoteMedia(fullPath);
                            }}
                            className={`grid grid-cols-12 cursor-pointer border-t border-slate-100 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-[#0f172a] dark:hover:bg-white/[0.04] ${
                              index % 2 === 0
                                ? "bg-transparent"
                                : "bg-slate-50/60 dark:bg-white/[0.015]"
                            } ${
                              listBusy ? "pointer-events-none opacity-80" : ""
                            }`}
                          >
                            <div
                              className={`col-span-5 truncate pr-2 cursor-pointer ${getBrandColorClass(item.name)}`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span className="truncate">{item.name}</span>
                                {isDir && directoryHasSizeJs[fullPath] && (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
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
                            <div className="col-span-1 flex items-center justify-end gap-1">
                              {!isDir &&
                                canManageDemoWriteFile &&
                                isEditableFileName(item.name) && (
                                  <Button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleOpenEditor(fullPath);
                                    }}
                                    variant="iconSuccess"
                                    size="icon"
                                    title="Edit file"
                                  >
                                    <PencilSquareIcon className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              {canManageDemoRename && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestRenamePath(fullPath, item.name);
                                  }}
                                  disabled={renamingPath === fullPath}
                                  variant="violet"
                                  size="icon"
                                  className="disabled:opacity-50"
                                  title={
                                    isDir ? "Rename directory" : "Rename file"
                                  }
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {canManageDemoDelete && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestDeletePath(fullPath, isDir);
                                  }}
                                  disabled={deletingPath === fullPath}
                                  variant="iconDanger"
                                  size="icon"
                                  className="disabled:opacity-50"
                                  title={
                                    isDir ? "Delete directory" : "Delete file"
                                  }
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
              </div>
            </div>
            {editorPath && canManageDemoWriteFile && (
              <div className="space-y-2.5 rounded-3xl border border-slate-200/90 bg-white p-3.5 shadow-md dark:border-slate-800 dark:bg-gradient-to-b dark:from-[#030a1a] dark:to-[#020617] dark:shadow-[0_14px_34px_rgba(2,6,23,0.42)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-mono text-xs text-slate-800 dark:text-[#e5e7eb]">
                    {displayRemotePath(editorPath)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setEditorPath(null);
                        setEditorContent("");
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Close
                    </Button>
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
                  </div>
                </div>
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="min-h-[200px] w-full resize-vertical rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 outline-none focus:border-[#4cceac]/60 dark:border-slate-800 dark:bg-[#01050f] dark:text-[#e5e7eb]"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:h-[calc(100vh-5rem)]">
          <div className="flex h-[calc(100vh-5rem)] max-h-[30rem] min-h-[20rem] flex-col rounded-[2rem] border border-slate-200/90 bg-white p-2.5 shadow-md sm:max-h-[calc(100vh-15rem)] sm:p-3 xl:min-h-0 dark:border-white/10 dark:bg-gradient-to-b dark:from-[#0b1730]/80 dark:to-[#081225]/90 dark:shadow-[0_16px_36px_rgba(2,6,23,0.42)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Live preview
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300/80">
                {config.category}
              </span>
            </div>
            <div className="flex-1 min-h-0 flex justify-center">
              <div
                className={`h-full max-h-[calc(100vh-15rem)] w-full bg-slate-100 ring-1 ring-slate-200 dark:bg-[#0f172a] dark:ring-white/10 ${
                  config.category === "Display"
                    ? "rounded-2xl p-2"
                    : "rounded-[2.25rem] p-2.5"
                }`}
              >
                <div
                  className={`relative overflow-hidden bg-black h-full ${
                    config.category === "Display"
                      ? "rounded-xl"
                      : "rounded-[1.8rem]"
                  }`}
                >
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title={`${config.category.toLowerCase()}-preview`}
                      className="absolute inset-0 h-full w-full border-0 bg-white"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      allow="autoplay; fullscreen; encrypted-media"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-slate-500 dark:text-white/70">
                      Preview unavailable for current path.
                    </div>
                  )}
                  {resolvingPreview && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 text-[10px] font-bold uppercase tracking-widest text-white">
                      Loading preview...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <NoticePopup
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={
          deleteConfirm?.isDir
            ? "Delete directory on SFTP?"
            : "Delete file on SFTP?"
        }
        description={
          deleteConfirm ? displayRemotePath(deleteConfirm.fullPath) : undefined
        }
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

      <InputPopup
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename"
        label="New name"
        submitLabel="Rename"
        placeholder="Filename or folder name"
        initialValue={renameTarget?.currentName ?? ""}
        validate={(v) => {
          if (!v.trim()) return "Enter a name.";
          if (v.includes("/") || v.includes("\\") || v === "." || v === "..")
            return "Invalid name.";
          return null;
        }}
        onSubmit={async (next) => {
          const t = renameTarget;
          if (!t || !next || next === t.currentName) return;
          await performRenamePath(t.fullPath, next);
        }}
      />

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

export default ManageDemo;
