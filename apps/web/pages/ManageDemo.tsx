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
} from "@heroicons/react/24/outline";
import { getYomediaDemoPreviewUrl } from "../components/OpenDemo";
import {
  loadActiveCreativeDemos,
  type CreativeDemoItem,
} from "../data/creativeDemos";
import { getServerBaseUrl } from "../lib/sftpBrowser";
import { fetchJsonOrThrow } from "../lib/apiError";
import Button from "../components/Button";

const BASE_REMOTE_PATH = "/script/demo";
const VIDEO_TARGET_MAX_BYTES = 4 * 1024 * 1024;
const VIDEO_COMPRESSIBLE_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
type RolePermissionConfig = Record<
  string,
  {
    manageDemo?: {
      canUseFileActionButtons?: boolean;
    };
  }
>;

const ManageDemo: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const [permissions, setPermissions] = React.useState<RolePermissionConfig>({
    default: { manageDemo: { canUseFileActionButtons: false } },
  });
  const canUseFileActionButtons =
    permissions[normalizedRole]?.manageDemo?.canUseFileActionButtons ??
    permissions.default?.manageDemo?.canUseFileActionButtons ??
    false;
  const canDropUpload = normalizedRole === "admin";
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

  const getItemLabelById = (list: any[], id: string) => {
    const found = list.find((item: any) => item.id === id);
    return String(found?.label ?? found?.id ?? id ?? "").trim();
  };

  type SftpEntry = {
    name: string;
    type: string;
    size: number;
    modifyTime?: number;
  };

  const [listEntries, setListEntries] = React.useState<SftpEntry[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [resolvingPreview, setResolvingPreview] = React.useState(false);
  const [directoryHasSizeJs, setDirectoryHasSizeJs] = React.useState<
    Record<string, boolean>
  >({});
  const [editorPath, setEditorPath] = React.useState<string | null>(null);
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [savingFile, setSavingFile] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
  const [renamingPath, setRenamingPath] = React.useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const [isDragOverTable, setIsDragOverTable] = React.useState(false);
  const [dragDepth, setDragDepth] = React.useState(0);
  const [uploadingDropFiles, setUploadingDropFiles] = React.useState(false);
  const [uploadSummary, setUploadSummary] = React.useState<string | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [activeDemos, setActiveDemos] = React.useState<CreativeDemoItem[]>([]);
  const [formatOptions, setFormatOptions] = React.useState<string[]>([]);
  const [config, setConfig] = React.useState({
    quality: currentYearId,
    mode: currentMonthId,
    formatValue: "",
    category: "Mobile" as "Mobile" | "Display",
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
        }>(`${getServerBaseUrl()}/api/permissions`);
        if (!cancelled && data?.permissions) {
          setPermissions(data.permissions);
        }
      } catch {
        if (!cancelled) {
          setPermissions({ default: { manageDemo: { canUseFileActionButtons: false } } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  React.useEffect(() => {
    const values = Array.from(
      new Set(
        activeDemos
          .filter((demo) => {
            const sizes = Array.isArray(demo.size)
              ? demo.size
              : demo.size
                ? [demo.size]
                : [];
            return sizes.some((s) =>
              detectedSizes.has(String(s).trim().toLowerCase()),
            );
          })
          .map((d) => (d.format ? String(d.format).trim() : ""))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    setFormatOptions(values);
  }, [activeDemos, detectedSizes]);

  const autoDetectedCategory = React.useMemo<
    "Mobile" | "Display" | null
  >(() => {
    const matchedCategories = new Set<"Mobile" | "Display">();
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
      if (demo.category === "Mobile" || demo.category === "Display") {
        matchedCategories.add(demo.category);
      }
    });

    if (matchedCategories.has("Mobile") && !matchedCategories.has("Display")) {
      return "Mobile";
    }
    if (matchedCategories.has("Display") && !matchedCategories.has("Mobile")) {
      return "Display";
    }
    if (matchedCategories.has(config.category)) return config.category;
    return null;
  }, [activeDemos, detectedSizes, config.category]);

  React.useEffect(() => {
    if (!autoDetectedCategory) return;
    if (config.category === autoDetectedCategory) return;
    setConfig((prev) => ({ ...prev, category: autoDetectedCategory }));
  }, [autoDetectedCategory, config.category]);

  React.useEffect(() => {
    if (config.formatValue && !formatOptions.includes(config.formatValue)) {
      setConfig((prev) => ({ ...prev, formatValue: "" }));
    }
  }, [config.formatValue, formatOptions]);

  React.useEffect(() => {
    let cancelled = false;
    setResolvingPreview(true);
    void (async () => {
      try {
        const serverApiUrl =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
        const url = await getYomediaDemoPreviewUrl({
          remotePath: currentPath,
          formatValue: config.formatValue || undefined,
          baseRemotePath: BASE_REMOTE_PATH,
          forceDevice: config.category === "Display" ? "pc" : "mb",
          serverApiUrl,
        });
        if (!cancelled) {
          if (url) {
            try {
              const u = new URL(url);
              u.searchParams.set("qr", "false");
              const withQrFlagDisabled = u.toString();
              console.log(
                "[ManageDemo] iframe preview URL (qr=false):",
                withQrFlagDisabled,
              );
              setPreviewUrl(withQrFlagDisabled);
            } catch {
              // Fallback: best-effort append if URL parsing fails.
              const withQrFlagDisabled = url.includes("?")
                ? `${url}&qr=false`
                : `${url}?qr=false`;
              console.log(
                "[ManageDemo] iframe preview URL (qr=false fallback):",
                withQrFlagDisabled,
              );
              setPreviewUrl(withQrFlagDisabled);
            }
          } else {
            setPreviewUrl(null);
          }
        }
      } catch {
        if (!cancelled) setPreviewUrl(null);
      } finally {
        if (!cancelled) setResolvingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPath, config.formatValue, config.category]);

  const pathForDisplay = currentPath.replace(
    /(\/script\/demo\/)\d{4}(\/)/,
    "$1…$2",
  );

  const buildRemoteRelativePath = (fullPath: string) => {
    if (fullPath.startsWith(BASE_REMOTE_PATH)) {
      return fullPath.slice(BASE_REMOTE_PATH.length).replace(/^\/+/, "");
    }
    return fullPath.replace(/^\/+/, "");
  };

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

  const navigateToPath = React.useCallback(
    (nextPath: string) => {
      if (!nextPath || nextPath === currentPath) return;
      if (loadingList || isNavigating) return;
      setIsNavigating(true);
      setCurrentPath(nextPath);
    },
    [currentPath, loadingList, isNavigating],
  );

  const openRemoteMedia = React.useCallback(
    (fullPath: string) => {
      const relative = buildRemoteRelativePath(fullPath);
      const baseUrl = "https://demo.yomedia.vn";
      const url = relative ? `${baseUrl}/${encodeURI(relative)}` : baseUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [buildRemoteRelativePath],
  );

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
    const baseUrl = getServerBaseUrl();

    const sortEntries = (list: SftpEntry[]) => {
      const filtered = list.filter(
        (e) => !e.name.startsWith(".") && !e.name.startsWith(".bash"),
      );
      return filtered.slice().sort((a, b) => {
        const isDirA = a.type === "d";
        const isDirB = b.type === "d";
        if (isDirA && !isDirB) return -1;
        if (!isDirA && isDirB) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    const fetchList = async (path: string): Promise<SftpEntry[]> => {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        entries?: SftpEntry[];
        error?: string;
      }>(`${baseUrl}/api/sftp/list?path=${encodeURIComponent(path)}`);
      if (!data.ok) {
        throw new Error(data.error || `Unable to list ${path}`);
      }
      return sortEntries((data.entries as SftpEntry[]) ?? []);
    };

    void (async () => {
      try {
        const entries = await fetchList(pathToList);
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
  }, [currentPath, reloadTick]);

  React.useEffect(() => {
    const dirs = listEntries.filter((entry) => entry.type === "d");
    if (dirs.length === 0) {
      setDirectoryHasSizeJs({});
      return;
    }

    let cancelled = false;
    const baseUrl = getServerBaseUrl();
    const sizeJsRegex = /^\d{2,4}x\d{2,4}\.js$/i;

    void (async () => {
      const checks = await Promise.all(
        dirs.map(async (dir) => {
          const fullPath = buildEntryFullPath(dir.name, currentPath);
          try {
            const data = await fetchJsonOrThrow<{
              ok?: boolean;
              entries?: SftpEntry[];
            }>(`${baseUrl}/api/sftp/list?path=${encodeURIComponent(fullPath)}`);
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
  }, [listEntries, currentPath, buildEntryFullPath]);

  const listBusy = loadingList || isNavigating;
  const roleHeader = React.useMemo(
    () =>
      normalizedRole
        ? ({
            "x-user-role": normalizedRole,
          } as const)
        : undefined,
    [normalizedRole],
  );

  const isEditableFileName = React.useCallback((name: string) => {
    const lower = name.toLowerCase();
    return /\.(html?|js|mjs|ts|css|json|txt|xml)$/i.test(lower);
  }, []);

  const handleOpenEditor = React.useCallback(async (fullPath: string) => {
    try {
      const baseUrl = getServerBaseUrl();
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        content?: string;
        error?: string;
      }>(`${baseUrl}/api/sftp/read?path=${encodeURIComponent(fullPath)}`);
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
  }, []);

  const handleSaveEditor = React.useCallback(async () => {
    if (!editorPath || !canUseFileActionButtons) return;
    setSavingFile(true);
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
            path: editorPath,
            content: editorContent,
          }),
        },
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
  }, [editorPath, editorContent, canUseFileActionButtons, roleHeader]);

  const handleDeletePath = React.useCallback(
    async (fullPath: string, isDir: boolean) => {
      if (!canUseFileActionButtons || deletingPath) return;
      const confirmed = window.confirm(
        `${isDir ? "Delete directory" : "Delete file"} on SFTP?\n${fullPath}`,
      );
      if (!confirmed) return;
      setDeletingPath(fullPath);
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
      canUseFileActionButtons,
      deletingPath,
      roleHeader,
      buildEntryFullPath,
      currentPath,
    ],
  );

  const handleRenamePath = React.useCallback(
    async (fullPath: string, currentName: string) => {
      if (!canUseFileActionButtons || renamingPath) return;
      const input = window.prompt("Enter new name", currentName);
      if (input == null) return;
      const nextName = input.trim();
      if (!nextName || nextName === currentName) return;
      if (
        nextName.includes("/") ||
        nextName.includes("\\") ||
        nextName === "." ||
        nextName === ".."
      ) {
        setListError("New name is invalid.");
        return;
      }

      const parent = getParentPath(fullPath) || "/";
      const targetPath = buildEntryFullPath(nextName, parent);
      setRenamingPath(fullPath);
      try {
        const baseUrl = getServerBaseUrl();
        const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
          `${baseUrl}/api/sftp/rename`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(roleHeader ?? {}),
            },
            body: JSON.stringify({
              oldPath: fullPath,
              newPath: targetPath,
            }),
          },
        );
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
      canUseFileActionButtons,
      renamingPath,
      getParentPath,
      buildEntryFullPath,
      roleHeader,
    ],
  );

  const handleCreateFolder = React.useCallback(async () => {
    if (!canUseFileActionButtons || creatingFolder) return;

    const input = window.prompt("Enter new folder name");
    if (input == null) return;

    const folderName = input.trim();
    if (!folderName) return;

    if (
      folderName.includes("/") ||
      folderName.includes("\\") ||
      folderName === "." ||
      folderName === ".."
    ) {
      setListError("Folder name is invalid.");
      return;
    }

    const targetPath = buildEntryFullPath(folderName, currentPath);
    setCreatingFolder(true);
    try {
      const baseUrl = getServerBaseUrl();
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        path?: string;
        error?: string;
      }>(`${baseUrl}/api/sftp/mkdir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(roleHeader ?? {}),
        },
        body: JSON.stringify({ path: targetPath }),
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
  }, [
    canUseFileActionButtons,
    creatingFolder,
    buildEntryFullPath,
    currentPath,
    roleHeader,
  ]);

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
        const baseUrl = getServerBaseUrl();
        const videoCompressionLogs: string[] = [];
        for (const file of validFiles) {
          const fileName = file.name.replace(/[\\/]/g, "_").trim();
          if (!fileName) continue;

          const targetPath = buildEntryFullPath(fileName, currentPath);
          const isVideoFile = isCompressibleVideoFileName(fileName);
          const data = isVideoFile
            ? await fetchJsonOrThrow<{
                ok?: boolean;
                error?: string;
                video?: {
                  originalBytes?: number;
                  compressedBytes?: number;
                  videoCompressed?: boolean;
                };
              }>(
                `${baseUrl}/api/sftp/write-binary?path=${encodeURIComponent(targetPath)}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/octet-stream",
                    ...(roleHeader ?? {}),
                  },
                  body: file,
                },
              )
            : await (async () => {
                const dataUrl = await readFileAsDataUrl(file);
                const base64 = dataUrl.includes(",")
                  ? dataUrl.split(",")[1]
                  : dataUrl;
                return fetchJsonOrThrow<{
                  ok?: boolean;
                  error?: string;
                  video?: {
                    originalBytes?: number;
                    compressedBytes?: number;
                    videoCompressed?: boolean;
                  };
                }>(`${baseUrl}/api/sftp/write`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(roleHeader ?? {}),
                  },
                  body: JSON.stringify({
                    path: targetPath,
                    content: base64,
                    encoding: "base64",
                  }),
                });
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
      roleHeader,
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
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1730] via-[#0b1730]/95 to-[#102449] p-4 sm:p-5 shadow-[0_18px_36px_rgba(2,6,23,0.42)]">
        <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300/80">
              SFTP demo manager
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e0e0e0] tracking-tight">
              Manage Demo
            </h1>
            <p className="text-xs text-slate-300/80">
              Browse demo assets, preview quickly, and edit production files
              with stronger visual clarity.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Current month
            </p>
            <p className="text-base font-semibold text-white">
              {getItemLabelById(manageYearOptions, config.quality)}/
              {demoPaths.month}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(560px,760px)_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1730]/80 to-[#0e203f]/75 p-3.5 shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Year
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.quality}
                  onChange={(e) =>
                    setConfig({ ...config, quality: e.target.value })
                  }
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  {manageYearOptions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-[#0b1730]"
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

            <div className="space-y-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1730]/80 to-[#13284b]/75 p-3.5 shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Month
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.mode}
                  onChange={(e) =>
                    setConfig({ ...config, mode: e.target.value })
                  }
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  {manageMonthOptions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-[#0b1730]"
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

            <div className="space-y-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1730]/80 to-[#10283f]/75 p-3.5 shadow-[0_12px_28px_rgba(2,6,23,0.38)] md:col-span-2">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Format
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.formatValue}
                  onChange={(e) =>
                    setConfig({ ...config, formatValue: e.target.value })
                  }
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  <option value="" className="bg-[#0b1730]">
                    Auto detect
                  </option>
                  {formatOptions.map((format) => (
                    <option
                      key={format}
                      value={format}
                      className="bg-[#0b1730]"
                    >
                      {format}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1730]/80 to-[#10283f]/75 p-3.5 shadow-[0_12px_28px_rgba(2,6,23,0.38)] md:col-span-2">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Category
                </label>
              </div>
              <div className="relative group">
                <select
                  value={config.category}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      category: e.target.value as "Mobile" | "Display",
                    }))
                  }
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-3 pl-4 pr-11 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_18px_rgba(2,6,23,0.3)]"
                >
                  <option value="Mobile" className="bg-[#0b1730]">
                    Mobile
                  </option>
                  <option value="Display" className="bg-[#0b1730]">
                    Display
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pb-4 sm:pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  SFTP folder
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canUseFileActionButtons && (
                  <Button
                    type="button"
                    onClick={() => void handleCreateFolder()}
                    disabled={creatingFolder || listBusy}
                    variant="secondary"
                    size="md"
                    className="inline-flex items-center gap-1.5"
                  >
                    <FolderPlusIcon className="h-4 w-4" />
                    {creatingFolder ? "Creating..." : "Create folder"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    const parent = getParentPath(currentPath);
                    if (parent) navigateToPath(parent);
                  }}
                  disabled={!getParentPath(currentPath) || listBusy}
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Month · {demoPaths.month}
              </span>
            </div>
            <p className="text-xs font-mono text-[#64748b] break-all px-1">
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
              className="relative rounded-3xl border border-slate-800/90 bg-gradient-to-b from-[#030a1a] via-[#020617] to-[#020617] overflow-hidden shadow-[0_14px_32px_rgba(2,6,23,0.5)]"
              onDragEnter={handleTableDragEnter}
              onDragOver={handleTableDragOver}
              onDragLeave={handleTableDragLeave}
              onDrop={handleTableDrop}
            >
              {canDropUpload && isDragOverTable && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020617]/85 backdrop-blur-[1px]">
                  <div className="rounded-2xl border border-cyan-400/45 bg-cyan-500/10 px-5 py-4 text-center shadow-[0_0_0_2px_rgba(34,211,238,0.2)]">
                    <p className="text-sm font-semibold text-cyan-200">
                      Drop files here to upload
                    </p>
                    <p className="mt-1 text-[11px] text-cyan-100/80 font-mono break-all">
                      {currentPath}
                    </p>
                  </div>
                </div>
              )}
              {canDropUpload && uploadingDropFiles && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#020617]/75">
                  <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white">
                    Uploading files...
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="sticky top-0 z-10 border-b border-slate-800 px-4 py-2.5 text-[11px] font-semibold text-slate-300 grid grid-cols-12 bg-[#020617]/95 backdrop-blur">
                    <div className="col-span-5">Name</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-right">Size</div>
                    <div className="col-span-2 text-right">Modified</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  <div className="max-h-[20rem] sm:max-h-[24rem] overflow-y-auto text-[12px] text-[#e5e7eb]">
                    {loadingList && listEntries.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-500">
                        Loading…
                      </div>
                    ) : listEntries.length === 0 ? (
                      <div className="px-4 py-10 text-center text-slate-400 space-y-3">
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
                            className={`px-4 py-2 grid grid-cols-12 border-t border-[#0f172a] hover:bg-white/[0.04] transition-colors cursor-pointer ${
                              index % 2 === 0
                                ? "bg-transparent"
                                : "bg-white/[0.015]"
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
                            <div className="col-span-2 flex items-center justify-center text-[#9ca3af]">
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
                            <div className="col-span-2 text-right text-[#9ca3af]">
                              {isDir ? "—" : formatSizeInMb(item.size)}
                            </div>
                            <div className="col-span-2 text-right text-[#6b7280]">
                              {item.modifyTime
                                ? new Date(item.modifyTime).toLocaleDateString(
                                    undefined,
                                    { day: "2-digit", month: "2-digit" },
                                  )
                                : "—"}
                            </div>
                            <div className="col-span-1 flex items-center justify-end gap-1">
                              {!isDir &&
                                canUseFileActionButtons &&
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
                              {canUseFileActionButtons && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleRenamePath(fullPath, item.name);
                                  }}
                                  disabled={renamingPath === fullPath}
                                  variant="iconSuccess"
                                  size="icon"
                                  className="disabled:opacity-50"
                                  title={
                                    isDir ? "Rename directory" : "Rename file"
                                  }
                                >
                                  <PencilIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              {canUseFileActionButtons && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeletePath(fullPath, isDir);
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
            {editorPath && canUseFileActionButtons && (
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-[#030a1a] to-[#020617] p-3.5 space-y-2.5 shadow-[0_14px_34px_rgba(2,6,23,0.42)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-[#e5e7eb] font-mono truncate">
                    {editorPath}
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
                  className="w-full min-h-[200px] bg-[#01050f] border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs font-mono text-[#e5e7eb] resize-vertical outline-none focus:border-[#4cceac]/60"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:h-[calc(100vh-5rem)]">
          <div className="h-[calc(100vh-5rem)] min-h-[20rem] xl:min-h-0 max-h-[30rem] sm:max-h-[calc(100vh-15rem)] rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#0b1730]/80 to-[#081225]/90 p-2.5 sm:p-3 shadow-[0_16px_36px_rgba(2,6,23,0.42)] flex flex-col">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Live preview
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
                {config.category}
              </span>
            </div>
            <div className="flex-1 min-h-0 flex justify-center">
              <div
                className={`w-full h-full max-h-[calc(100vh-15rem)] bg-[#0f172a] ring-1 ring-white/10 ${
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
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70 px-3 text-center">
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
    </div>
  );
};

export default ManageDemo;
