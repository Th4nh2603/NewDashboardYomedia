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
} from "@heroicons/react/24/outline";
import { getYomediaDemoPreviewUrl } from "../components/OpenDemo";
import {
  loadActiveCreativeDemos,
  type CreativeDemoItem,
} from "../data/creativeDemos";

const BASE_REMOTE_PATH = "/script/demo";

function getServerBaseUrl(): string {
  return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
}

const ManageDemo: React.FC = () => {
  useAuth();
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
      const res = await fetch(
        `${baseUrl}/api/sftp/list?path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
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
  }, [currentPath]);

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
            const res = await fetch(
              `${baseUrl}/api/sftp/list?path=${encodeURIComponent(fullPath)}`,
            );
            const data = await res.json();
            if (!res.ok || !data?.ok || !Array.isArray(data?.entries)) {
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

  return (
    <div className="w-full px-4 sm:px-6   space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#e0e0e0] tracking-tight">
          Manage Demo
        </h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(560px,760px)_minmax(0,1fr)] gap-8 items-start">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 rounded-3xl border border-white/5 bg-[#0b1730]/60 p-4 shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
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
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.35)]"
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

            <div className="space-y-3 rounded-3xl border border-white/5 bg-[#0b1730]/60 p-4 shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
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
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.35)]"
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

            <div className="space-y-3 rounded-3xl border border-white/5 bg-[#0b1730]/60 p-4 shadow-[0_12px_36px_rgba(2,6,23,0.35)] md:col-span-2">
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
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.35)]"
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

            <div className="space-y-3 rounded-3xl border border-white/5 bg-[#0b1730]/60 p-4 shadow-[0_12px_36px_rgba(2,6,23,0.35)] md:col-span-2">
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
                  className="w-full bg-[#111c36] border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-sm font-semibold tracking-wide text-white outline-none focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20 transition-all appearance-none cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(2,6,23,0.35)]"
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

          <div className="space-y-3 pb-8 sm:pb-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  SFTP folder
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const parent = getParentPath(currentPath);
                    if (parent) navigateToPath(parent);
                  }}
                  disabled={!getParentPath(currentPath) || listBusy}
                  className="rounded-2xl bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#e5e7eb] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Back
                </button>
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
            <div className="rounded-3xl border border-[#1f2937] bg-[#020617] overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="border-b border-[#1f2937] px-4 py-3 text-[12px] font-semibold text-[#9ca3af] grid grid-cols-12 bg-[#020617]/80">
                    <div className="col-span-6">Name</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-right">Size</div>
                    <div className="col-span-2 text-right">Modified</div>
                  </div>
                  <div className="max-h-[24rem] sm:max-h-[28rem] overflow-y-auto text-[12px] text-[#e5e7eb]">
                    {loadingList && listEntries.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[#6b7280]">
                        Loading…
                      </div>
                    ) : listEntries.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[#6b7280] space-y-3">
                        <p>No entries in this directory.</p>
                        {currentPath !== demoPaths.pathYearMonth && (
                          <button
                            type="button"
                            onClick={() =>
                              navigateToPath(demoPaths.pathYearMonth)
                            }
                            disabled={listBusy}
                            className="rounded-2xl bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#e5e7eb] hover:bg-white/10"
                          >
                            Back to month folder
                          </button>
                        )}
                      </div>
                    ) : (
                      listEntries.map((item) => {
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
                            className={`px-4 py-2.5 grid grid-cols-12 border-t border-[#0f172a] hover:bg-white/[0.04] transition-colors cursor-pointer ${
                              listBusy ? "pointer-events-none opacity-80" : ""
                            }`}
                          >
                            <div
                              className={`col-span-6 truncate pr-2 cursor-pointer ${getBrandColorClass(item.name)}`}
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
                              {isDir ? "—" : item.size}
                            </div>
                            <div className="col-span-2 text-right text-[#6b7280]">
                              {item.modifyTime
                                ? new Date(item.modifyTime).toLocaleDateString(
                                    undefined,
                                    { day: "2-digit", month: "2-digit" },
                                  )
                                : "—"}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:h-[calc(100vh-5rem)]">
          <div className="h-full min-h-[22rem] xl:min-h-0 max-h-[32rem] sm:max-h-[calc(100vh-15rem)] rounded-[2rem] border border-white/10 bg-[#0b1730]/60 p-3 sm:p-4 shadow-[0_20px_40px_rgba(2,6,23,0.4)] flex flex-col">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={openCurrentDemo}
                disabled={!previewUrl}
                className="w-full sm:w-auto rounded-2xl bg-[#4cceac]/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#4cceac] hover:bg-[#4cceac]/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Open demo
              </button>
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
