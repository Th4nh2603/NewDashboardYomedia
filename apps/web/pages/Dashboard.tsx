import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon,
  FolderIcon,
  DocumentIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const DEFAULT_SFTP_PATH = "/script/demo";

function getServerBaseUrl(): string {
  return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
}

type SftpEntry = {
  name: string;
  type: string;
  size: number;
  modifyTime?: number;
};

type SftpSearchMatch = {
  fullPath: string;
  relativePath: string;
  matchedName: string;
};

function sortSftpEntries(list: SftpEntry[]): SftpEntry[] {
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
}

function getParentPath(path: string): string | null {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (trimmed === "/" || trimmed === "") return null;
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return trimmed.slice(0, lastSlash) || "/";
}

function joinPath(base: string, name: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return b === "/" ? `/${name}` : `${b}/${name}`;
}

const Dashboard: React.FC = () => {
  const [sftpPath, setSftpPath] = React.useState(DEFAULT_SFTP_PATH);
  const [pathDraft, setPathDraft] = React.useState(DEFAULT_SFTP_PATH);
  const [filterQuery, setFilterQuery] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [searchMatches, setSearchMatches] = React.useState<SftpSearchMatch[]>(
    [],
  );
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [searchRefreshToken, setSearchRefreshToken] = React.useState(0);
  const [listEntries, setListEntries] = React.useState<SftpEntry[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const loadSftpList = React.useCallback(async (path: string) => {
    setLoadingList(true);
    setListError(null);
    try {
      const baseUrl = getServerBaseUrl();
      const res = await fetch(
        `${baseUrl}/api/sftp/list?path=${encodeURIComponent(path)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        entries?: SftpEntry[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Unable to list ${path}`);
      }
      setListEntries(sortSftpEntries(Array.isArray(data.entries) ? data.entries : []));
      setSftpPath(path);
      setPathDraft(path);
    } catch (err) {
      setListEntries([]);
      setListError(err instanceof Error ? err.message : "SFTP list failed");
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSftpList(DEFAULT_SFTP_PATH);
  }, [loadSftpList]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filterQuery.trim()), 400);
    return () => window.clearTimeout(id);
  }, [filterQuery]);

  React.useEffect(() => {
    if (debouncedQ.length < 2) {
      setSearchMatches([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    const baseUrl = getServerBaseUrl();
    void (async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/sftp/search-directories?path=${encodeURIComponent(sftpPath)}&q=${encodeURIComponent(debouncedQ)}`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          matches?: SftpSearchMatch[];
          error?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Tìm thư mục thất bại");
        }
        if (!cancelled) {
          setSearchMatches(Array.isArray(data.matches) ? data.matches : []);
        }
      } catch (e) {
        if (!cancelled) {
          setSearchMatches([]);
          setSearchError(
            e instanceof Error ? e.message : "Tìm thư mục thất bại",
          );
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, sftpPath, searchRefreshToken]);

  const useRecursiveSearch = debouncedQ.length >= 2;

  // Lọc tên ở cấp hiện tại khi chưa dùng tìm đệ quy (< 2 ký tự sau debounce).
  const flatFiltered = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return listEntries;
    return listEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [listEntries, filterQuery]);

  const parentPath = getParentPath(sftpPath);

  const openDirectory = (name: string) => {
    if (loadingList) return;
    const next = joinPath(sftpPath, name);
    void loadSftpList(next);
  };

  const openPath = (fullPath: string) => {
    if (loadingList) return;
    void loadSftpList(fullPath);
  };

  const quickActions = [
    {
      name: "AI Chat",
      path: "/chat",
      icon: ChatBubbleBottomCenterTextIcon,
      color: "bg-indigo-500/10 text-indigo-400",
    },
    {
      name: "Generate Image",
      path: "/image-generator",
      icon: PhotoIcon,
      color: "bg-[#4cceac]/10 text-[#4cceac]",
    },
    {
      name: "Vision AI",
      path: "/vision",
      icon: SparklesIcon,
      color: "bg-amber-500/10 text-amber-400",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex justify-between items-end">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-[#e0e0e0] tracking-tight">
            DEMO
          </h1>
          <p className="text-[#4cceac] font-medium mt-1">
            Welcome to your AI Creative Suite
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Link key={action.name} to={action.path}>
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-3xl border border-white/5 bg-[#1f2a40]/50 backdrop-blur-sm shadow-xl flex items-center gap-4 group transition-all`}
            >
              <div
                className={`p-3 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}
              >
                <action.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[#e0e0e0] font-bold">{action.name}</h3>
                <p className="text-[#a3a3a3] text-xs mt-0.5">
                  Quick access to AI tools
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#020617] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">SFTP browser</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Ô tìm kiếm: từ <span className="text-white/80">2 ký tự</span> trở lên
              sẽ tìm <span className="text-[#4cceac]">đệ quy</span> mọi thư mục con
              dưới &quot;Đường dẫn SFTP&quot; (vd gõ{" "}
              <span className="font-mono text-[#e5e7eb]">maxkleen</span> → hiện{" "}
              <span className="font-mono text-[#e5e7eb]">2026/03/maxkleen</span>
              ). Dưới 2 ký tự chỉ lọc tên ở cấp hiện tại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadSftpList(sftpPath);
              if (debouncedQ.length >= 2) {
                setSearchRefreshToken((x) => x + 1);
              }
            }}
            disabled={loadingList}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`}
            />
            Tải lại
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
              Đường dẫn SFTP
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void loadSftpList(pathDraft.trim() || DEFAULT_SFTP_PATH);
                  }
                }}
                placeholder="/script/demo/..."
                spellCheck={false}
                className="flex-1 rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4cceac]/50"
              />
              <button
                type="button"
                onClick={() =>
                  void loadSftpList(pathDraft.trim() || DEFAULT_SFTP_PATH)
                }
                disabled={loadingList}
                className="shrink-0 rounded-xl bg-[#4cceac]/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#9ff3de] border border-[#4cceac]/30 hover:bg-[#4cceac]/30 disabled:opacity-50"
              >
                List
              </button>
            </div>
          </div>
          {parentPath != null && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadSftpList(parentPath)}
                disabled={loadingList}
                className="w-full lg:w-auto rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-xs font-semibold text-[#e5e7eb] hover:bg-white/5 disabled:opacity-50"
              >
                Lên thư mục cha
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            <FunnelIcon className="h-3.5 w-3.5 text-[#4cceac]" />
            Tìm thư mục (đệ quy từ gốc)
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="vd: maxkleen → 2026/03/maxkleen (≥2 ký tự)"
              className="w-full rounded-xl border border-white/10 bg-[#0b1220] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4cceac]/50"
            />
          </div>
        </div>

        <p className="text-[11px] font-mono text-[#94a3b8] break-all">
          Đang xem: <span className="text-[#e5e7eb]">{sftpPath}</span>
          {useRecursiveSearch ? (
            <span className="text-[#4cceac]">
              {" "}
              · tìm đệ quy &quot;{debouncedQ}&quot;
              {searchLoading
                ? "…"
                : ` → ${searchMatches.length} thư mục`}
            </span>
          ) : filterQuery.trim() ? (
            <span className="text-[#4cceac]">
              {" "}
              · cấp hiện tại: {flatFiltered.length}/{listEntries.length} mục
            </span>
          ) : null}
        </p>

        {listError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {listError}
          </div>
        )}
        {searchError && useRecursiveSearch && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {searchError}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1220]">
                {useRecursiveSearch ? (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac]">
                      Đường dẫn (từ gốc)
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-36">
                      Mở
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac]">
                      Tên
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-28">
                      Loại
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-32 text-right">
                      Kích thước
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {useRecursiveSearch ? (
                searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-10 text-center text-[#94a3b8]"
                    >
                      Đang tìm trong cây thư mục…
                    </td>
                  </tr>
                ) : !searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-10 text-center text-[#94a3b8]"
                    >
                      Không có thư mục nào khớp.
                    </td>
                  </tr>
                ) : (
                  searchMatches.map((m) => (
                    <tr
                      key={m.fullPath}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-mono text-[13px] text-[#e5e7eb] break-all">
                              {m.relativePath || m.matchedName}
                            </p>
                            <p className="text-[10px] text-[#64748b] mt-1 break-all font-mono">
                              {m.fullPath}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => openPath(m.fullPath)}
                          disabled={loadingList}
                          className="text-xs font-semibold text-[#7dd3fc] hover:underline disabled:opacity-50"
                        >
                          Mở thư mục
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : loadingList && listEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[#94a3b8]"
                  >
                    Đang tải danh sách…
                  </td>
                </tr>
              ) : flatFiltered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[#94a3b8]"
                  >
                    {listEntries.length === 0
                      ? "Không có mục nào hoặc chưa tải được."
                      : "Không mục nào khớp bộ lọc."}
                  </td>
                </tr>
              ) : (
                flatFiltered.map((entry) => {
                  const isDir = entry.type === "d";
                  return (
                    <tr
                      key={`${entry.type}-${entry.name}`}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!isDir || loadingList}
                          onClick={() => isDir && openDirectory(entry.name)}
                          className={`inline-flex items-center gap-2 text-left ${
                            isDir
                              ? "text-[#7dd3fc] hover:underline cursor-pointer"
                              : "text-[#e5e7eb] cursor-default"
                          } disabled:opacity-60`}
                        >
                          {isDir ? (
                            <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90" />
                          ) : (
                            <DocumentIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-mono text-[13px] break-all">
                            {entry.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[#a3a3a3]">
                        {isDir ? "Thư mục" : "File"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#a3a3a3] font-mono text-xs">
                        {isDir ? "—" : entry.size.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
