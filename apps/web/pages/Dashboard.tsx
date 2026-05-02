import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon,
  FolderIcon,
  DocumentIcon,
  ArrowPathIcon,
  BoltIcon,
  RectangleStackIcon,
  ChartBarIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import {
  fetchSftpList,
  fetchSftpSearch,
  getParentPath,
  joinPath,
  type SftpEntry,
} from "../lib/sftpBrowser";
import { useTheme } from "../contexts/ThemeContext";
import { interpolate, useLanguage } from "../contexts/LanguageContext";

const DEFAULT_SFTP_PATH = "/script/demo";

type SftpSearchMatch = {
  fullPath: string;
  relativePath: string;
  matchedName: string;
};

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { tDashboard } = useLanguage();
  const isDark = theme === "dark";
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

  const shell = isDark
    ? "border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
    : "border-slate-200/90 bg-white/80 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]";
  const muted = isDark ? "text-[#94a3b8]" : "text-slate-500";
  const heading = isDark ? "text-white" : "text-slate-900";
  const subCard = isDark
    ? "border-white/[0.06] bg-[#151d2f]/90"
    : "border-slate-200/80 bg-slate-50/90";

  const loadSftpList = React.useCallback(async (path: string) => {
    setLoadingList(true);
    setListError(null);
    try {
      const entries = await fetchSftpList(path);
      setListEntries(entries);
      setSftpPath(path);
      setPathDraft(path);
    } catch (err) {
      setListEntries([]);
      setListError(
        err instanceof Error ? err.message : tDashboard("errSftpList"),
      );
    } finally {
      setLoadingList(false);
    }
  }, [tDashboard]);

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
    void (async () => {
      try {
        const data = await fetchSftpSearch(sftpPath, debouncedQ);
        if (!cancelled) {
          setSearchMatches(data);
        }
      } catch (e) {
        if (!cancelled) {
          setSearchMatches([]);
          setSearchError(
            e instanceof Error ? e.message : tDashboard("errFolderSearch"),
          );
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, sftpPath, searchRefreshToken, tDashboard]);

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

  const quickActions = React.useMemo(
    () => [
      {
        name: tDashboard("quickAiChatName"),
        desc: tDashboard("quickAiChatDesc"),
        path: "/chat",
        icon: ChatBubbleBottomCenterTextIcon,
        accent: "from-indigo-500/90 to-violet-600/90",
        iconBg: isDark ? "bg-indigo-500/15" : "bg-indigo-500/12",
        iconClr: "text-indigo-400",
      },
      {
        name: tDashboard("quickImageName"),
        desc: tDashboard("quickImageDesc"),
        path: "/image-generator",
        icon: PhotoIcon,
        accent: "from-[#4cceac]/90 to-teal-600/90",
        iconBg: isDark ? "bg-[#4cceac]/15" : "bg-emerald-500/12",
        iconClr: "text-[#4cceac]",
      },
      {
        name: tDashboard("quickVisionName"),
        desc: tDashboard("quickVisionDesc"),
        path: "/vision",
        icon: SparklesIcon,
        accent: "from-amber-500/90 to-orange-600/85",
        iconBg: isDark ? "bg-amber-500/15" : "bg-amber-500/12",
        iconClr: "text-amber-400",
      },
      {
        name: tDashboard("quickBuildDemoName"),
        desc: tDashboard("quickBuildDemoDesc"),
        path: "/build-demo",
        icon: WrenchScrewdriverIcon,
        accent: "from-sky-500/90 to-blue-700/85",
        iconBg: isDark ? "bg-sky-500/15" : "bg-sky-500/12",
        iconClr: "text-sky-400",
      },
      {
        name: tDashboard("quickShowcaseName"),
        desc: tDashboard("quickShowcaseDesc"),
        path: "/creative-showcase",
        icon: RectangleStackIcon,
        accent: "from-fuchsia-500/85 to-purple-700/85",
        iconBg: isDark ? "bg-fuchsia-500/15" : "bg-fuchsia-500/10",
        iconClr: "text-fuchsia-400",
      },
      {
        name: tDashboard("quickDocsName"),
        desc: tDashboard("quickDocsDesc"),
        path: "/documentation",
        icon: DocumentIcon,
        accent: "from-slate-500/80 to-slate-700/80",
        iconBg: isDark ? "bg-white/10" : "bg-slate-500/10",
        iconClr: isDark ? "text-slate-300" : "text-slate-600",
      },
    ],
    [tDashboard, isDark],
  );

  const stats = React.useMemo(
    () => [
      {
        label: tDashboard("statCampaignsLabel"),
        value: "12",
        hint: tDashboard("statCampaignsHint"),
        icon: RocketLaunchIcon,
        ring: "from-[#4cceac]/40 to-transparent",
      },
      {
        label: tDashboard("statAssetsLabel"),
        value: "248",
        hint: tDashboard("statAssetsHint"),
        icon: BoltIcon,
        ring: "from-amber-400/35 to-transparent",
      },
      {
        label: tDashboard("statBriefLabel"),
        value: "94%",
        hint: tDashboard("statBriefHint"),
        icon: ChartBarIcon,
        ring: "from-indigo-400/35 to-transparent",
      },
      {
        label: tDashboard("statModelLabel"),
        value: tDashboard("statModelValue"),
        hint: tDashboard("statModelHint"),
        icon: CpuChipIcon,
        ring: "from-fuchsia-400/30 to-transparent",
      },
    ],
    [tDashboard],
  );

  return (
    <div className="flex flex-col gap-10 max-w-[1600px] mx-auto w-full pb-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative overflow-hidden rounded-[2rem] border p-8 md:p-10 ${shell}`}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-70 bg-gradient-to-br from-[#4cceac]/30 to-indigo-600/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/15"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${isDark ? "border-[#4cceac]/35 bg-[#4cceac]/10 text-[#4cceac]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4cceac] animate-pulse" />
              {tDashboard("workspaceBadge")}
            </span>
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] ${heading}`}
            >
              {tDashboard("heroTitleLead")}
              <span className="bg-gradient-to-r from-[#4cceac] via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                {tDashboard("heroTitleAccent")}
              </span>
            </h1>
            <p className={`text-base md:text-lg leading-relaxed ${muted}`}>
              {tDashboard("heroSubtitle")}
            </p>
          </div>
          <Link
            to="/chat"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4cceac]/20 bg-gradient-to-r from-[#4cceac] to-indigo-600 hover:brightness-110 transition-all shrink-0`}
          >
            {tDashboard("ctaChat")}
            <SparklesIcon className="h-5 w-5 opacity-90" />
          </Link>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`relative rounded-2xl border p-5 overflow-hidden ${subCard}`}
          >
            <div
              className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${s.ring}`}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className={`rounded-xl p-2 ${isDark ? "bg-white/5" : "bg-white shadow-sm border border-slate-200/60"}`}>
                <s.icon className={`h-5 w-5 ${muted}`} />
              </div>
            </div>
            <p className={`relative mt-4 text-2xl font-black tabular-nums ${heading}`}>
              {s.value}
            </p>
            <p className={`relative text-xs font-semibold uppercase tracking-wide mt-1 ${muted}`}>
              {s.label}
            </p>
            <p className={`relative text-[11px] mt-2 ${muted} opacity-80`}>
              {s.hint}
            </p>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h2 className={`text-xl font-black ${heading}`}>Lối tắt creative</h2>
            <p className={`text-sm mt-1 ${muted}`}>
              Các luồng hay dùng — hover để “nổi” card.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {quickActions.map((action, i) => (
            <Link key={action.path} to={action.path}>
              <motion.article
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                className={`group h-full rounded-2xl border p-6 relative overflow-hidden ${shell}`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${action.accent} opacity-90`}
                  aria-hidden
                />
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl p-3.5 shrink-0 ${action.iconBg} ring-1 ${isDark ? "ring-white/10" : "ring-black/[0.04]"}`}
                  >
                    <action.icon className={`w-7 h-7 ${action.iconClr}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-lg ${heading} group-hover:text-[#4cceac] transition-colors`}>
                      {action.name}
                    </h3>
                    <p className={`text-sm mt-1 leading-snug ${muted}`}>
                      {action.desc}
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${muted}`}
                >
                  {tDashboard("quickOpenTool")}
                  <span className={`transition-transform group-hover:translate-x-1 ${heading}`}>
                    →
                  </span>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-[1.75rem] border overflow-hidden ${shell}`}
      >
        <div
          className={`flex flex-col gap-1 px-6 py-5 border-b ${isDark ? "border-white/[0.06] bg-white/[0.03]" : "border-slate-200/90 bg-slate-50/50"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={`text-lg font-black ${heading}`}>
                {tDashboard("sftpTitle")}
              </h2>
              <p className={`text-sm ${muted}`}>
                {tDashboard("sftpSubtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchRefreshToken((t) => t + 1);
                void loadSftpList(sftpPath);
              }}
              disabled={loadingList}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                isDark
                  ? "bg-white/10 hover:bg-white/15 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`}
              />
              {tDashboard("sftpRefresh")}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 min-w-0 ${
                isDark
                  ? "border-white/10 bg-[#0f172a]/50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <MagnifyingGlassIcon className={`h-4 w-4 shrink-0 ${muted}`} />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={tDashboard("sftpSearchPlaceholder")}
                className={`bg-transparent border-none outline-none text-sm w-full min-w-0 ${
                  isDark
                    ? "text-[#e8e8e8] placeholder:text-slate-500"
                    : "text-slate-900 placeholder:text-slate-400"
                }`}
              />
              {searchLoading && (
                <span className={`text-[10px] font-bold uppercase ${muted}`}>
                  …
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {parentPath !== null && (
                <button
                  type="button"
                  disabled={loadingList}
                  onClick={() => openPath(parentPath)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-colors disabled:opacity-50 ${
                    isDark
                      ? "border-white/10 hover:bg-white/10 text-[#e0e0e0]"
                      : "border-slate-200 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  {tDashboard("sftpParent")}
                </button>
              )}
              <button
                type="button"
                disabled={loadingList || !pathDraft.trim()}
                onClick={() => void loadSftpList(pathDraft.trim())}
                className={`rounded-xl px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#4cceac] to-teal-600 text-white hover:brightness-105 disabled:opacity-50`}
              >
                {tDashboard("sftpGoPath")}
              </button>
            </div>
          </div>
          <input
            type="text"
            value={pathDraft}
            onChange={(e) => setPathDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                void loadSftpList(pathDraft.trim());
            }}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs font-mono ${
              isDark
                ? "border-white/10 bg-[#0f172a]/40 text-[#cbd5e1]"
                : "border-slate-200 bg-white text-slate-700"
            }`}
            spellCheck={false}
          />
          {debouncedQ.length >= 2 && (
            <div className={`mt-3 rounded-xl border p-3 text-sm ${subCard}`}>
              {searchError && (
                <p className="text-red-500 font-medium">{searchError}</p>
              )}
              {!searchError && searchMatches.length === 0 && !searchLoading && (
                <p className={muted}>
                  {interpolate(tDashboard("sftpNoMatch"), {
                    query: debouncedQ,
                  })}
                </p>
              )}
              {searchMatches.length > 0 && (
                <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {searchMatches.map((m) => (
                    <li key={m.fullPath}>
                      <button
                        type="button"
                        className={`text-left w-full rounded-lg px-2 py-1.5 font-mono text-xs hover:bg-[#4cceac]/10 transition-colors ${heading}`}
                        onClick={() => openPath(m.fullPath)}
                      >
                        {m.relativePath || m.fullPath}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={`p-4 md:p-5 min-h-[200px]`}>
          {listError && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${isDark ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-red-200 bg-red-50 text-red-800"}`}
            >
              {listError}
            </div>
          )}
          {!listError && loadingList && listEntries.length === 0 && (
            <div className={`flex items-center justify-center py-16 ${muted}`}>
              {tDashboard("sftpLoadingList")}
            </div>
          )}
          {!listError && !loadingList && flatFiltered.length === 0 && (
            <div className={`flex items-center justify-center py-14 ${muted}`}>
              {tDashboard("sftpEmpty")}
            </div>
          )}
          {!listError && flatFiltered.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {flatFiltered.map((entry) => {
                const isDir = entry.type === "d";
                return (
                  <li key={entry.name}>
                    <button
                      type="button"
                      disabled={!isDir || loadingList}
                      onClick={() => {
                        if (isDir) openDirectory(entry.name);
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all ${
                        isDir
                          ? isDark
                            ? "border-white/[0.08] hover:bg-white/[0.06] hover:border-[#4cceac]/35"
                            : "border-slate-200/90 hover:bg-slate-50 hover:border-[#4cceac]/40"
                          : isDark
                            ? "border-white/[0.04] opacity-75 cursor-default"
                            : "border-slate-100 opacity-90 cursor-default"
                      }`}
                    >
                      <span
                        className={`shrink-0 rounded-lg p-2 ${isDark ? "bg-white/5" : "bg-slate-100"}`}
                      >
                        {isDir ? (
                          <FolderIcon className={`h-5 w-5 ${muted}`} />
                        ) : (
                          <DocumentIcon className={`h-5 w-5 ${muted}`} />
                        )}
                      </span>
                      <span className={`font-semibold truncate ${heading}`}>
                        {entry.name}
                      </span>
                      {!isDir && (
                        <span className={`ml-auto text-[10px] font-bold uppercase shrink-0 ${muted}`}>
                          {tDashboard("fileLabel")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default Dashboard;
