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
import {
  fetchSftpList,
  fetchSftpSearch,
  getParentPath,
  joinPath,
  type SftpEntry,
} from "../lib/sftpBrowser";

const DEFAULT_SFTP_PATH = "/script/demo";

type SftpSearchMatch = {
  fullPath: string;
  relativePath: string;
  matchedName: string;
};

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
      const entries = await fetchSftpList(path);
      setListEntries(entries);
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


    </div>
  );
};

export default Dashboard;
