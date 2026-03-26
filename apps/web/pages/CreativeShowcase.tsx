import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Square3Stack3DIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CommandLineIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { getYomediaDemoPreviewUrl } from "../components/OpenDemo";

/** Hiển thị Size: phần tử đầu của mảng `size` (hoặc chuỗi). */
function displayPrimarySize(item: { size?: string | string[] }): string {
  const s = item.size;
  if (Array.isArray(s) && s.length > 0) return String(s[0]).trim();
  if (typeof s === "string" && s.trim() !== "") return s.trim();
  return "-";
}

function toSafeZipName(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ");
  return (cleaned || "creative-demo") + ".zip";
}

interface DemoItem {
  id: string;
  title: string;
  image: string;
  size?: string | string[];
  position: string;
  fileType: string;
  value?: string;
  /** mp4 nếu title có iTVC, ngược lại none */
  video?: string;
  source?: string;
  status?: string;
  category: "Display" | "Video" | "Mobile";
}

/** Khung iPhone 16 Pro Max (titanium + Dynamic Island); màn hình = iframe demo + ảnh poster khi tải. */
function Iphone16ProMaxShowcaseFrame({
  title,
  posterImage,
  iframeSrc,
  urlResolving,
  children,
}: {
  title: string;
  posterImage: string;
  iframeSrc: string | null;
  urlResolving: boolean;
  children: React.ReactNode;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    console.log("iframeSrc", iframeSrc);
    setIframeLoaded(false);
  }, [iframeSrc]);

  const showPoster = !iframeSrc || !iframeLoaded || urlResolving;

  return (
    <div className="relative mx-auto flex w-full max-w-[240px] flex-col items-center py-4 sm:max-w-[300px]">
      {/* Nút Action / rung (gợi ý viền máy) */}
      <div
        className="pointer-events-none absolute -left-0.5 top-[18%] z-10 h-8 w-[3px] rounded-full bg-gradient-to-b from-[#2a2a2c] to-[#1a1a1c] shadow-sm sm:top-[20%] sm:h-10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-0.5 top-[28%] z-10 h-14 w-[3px] rounded-full bg-gradient-to-b from-[#2a2a2c] via-[#1f1f21] to-[#1a1a1c] sm:top-[30%] sm:h-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-0.5 top-[24%] z-10 h-20 w-[3px] rounded-full bg-gradient-to-b from-[#2a2a2c] to-[#1a1a1c] sm:top-[26%] sm:h-24"
        aria-hidden
      />

      <div
        className="relative w-full shadow-[0_28px_56px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]"
        style={{ aspectRatio: "430 / 895" }}
      >
        {/* Vỏ titanium */}
        <div className="absolute inset-0 rounded-[2.35rem] bg-gradient-to-br from-[#8e8e93] via-[#636366] to-[#3a3a3c] p-[3.5%] ring-1 ring-white/15">
          <div className="relative h-full w-full rounded-[2.05rem] bg-[#0c0c0c] p-[2.2%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <div className="relative h-full w-full overflow-hidden rounded-[1.78rem] bg-black">
              <img
                src={posterImage}
                alt=""
                className={`absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-500 ${
                  showPoster ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                referrerPolicy="no-referrer"
              />

              {iframeSrc ? (
                <iframe
                  src={iframeSrc}
                  title={title}
                  className={`absolute inset-0 z-[2] h-full w-full border-0 bg-black transition-opacity duration-500 ${
                    iframeLoaded && !urlResolving ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setIframeLoaded(true)}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : null}

              {urlResolving ? (
                <div className="absolute inset-0 z-[14] flex items-center justify-center bg-black/40">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                    Loading demo…
                  </span>
                </div>
              ) : null}

              {/* Dynamic Island */}
              <div
                className="pointer-events-none absolute left-1/2 top-[1.75%] z-20 h-[3.4%] min-h-[11px] w-[34%] max-w-[120px] -translate-x-1/2 rounded-full bg-black shadow-[0_4px_14px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)] ring-[0.5px] ring-white/[0.06]"
                aria-hidden
              />

              {/* Viền kính mờ góc máy */}
              <div className="pointer-events-none absolute inset-0 z-[19] rounded-[1.78rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_20px_40px_-20px_rgba(255,255,255,0.06)]" />

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileIphonePreviewWithEmbed({
  item,
  serverApiUrl,
}: {
  item: DemoItem;
  serverApiUrl: string;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [urlResolving, setUrlResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const path = item.source?.trim() ?? "";

    if (!path) {
      setIframeSrc(null);
      setUrlResolving(false);
      return;
    }

    setUrlResolving(true);
    setIframeSrc(null);

    void (async () => {
      try {
        const url = await getYomediaDemoPreviewUrl({
          remotePath: path,
          formatValue: item.value,
          forceDevice: "mb",
          serverApiUrl,
        });
        if (!cancelled) setIframeSrc(url);
      } finally {
        if (!cancelled) setUrlResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item.id, item.source, item.value, serverApiUrl]);

  return (
    <Iphone16ProMaxShowcaseFrame
      title={item.title}
      posterImage={item.image}
      iframeSrc={iframeSrc}
      urlResolving={urlResolving}
    >
      <div className="pointer-events-none absolute inset-0 z-[25] bg-gradient-to-t from-[#141b2d]/90 via-transparent to-transparent opacity-50" />

      <div className="absolute top-3 left-3 right-3 z-30 flex justify-start pointer-events-none">
        <span className="pointer-events-auto bg-[#141b2d]/90 backdrop-blur-md border border-white/10 text-[#4cceac] text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          {item.category}
        </span>
      </div>
    </Iphone16ProMaxShowcaseFrame>
  );
}

const CreativeShowcase: React.FC = () => {
  const ITEMS_PER_PAGE = 8;
  const { user } = useAuth();
  const isAdsop = (user?.role || "").toLowerCase() === "adsop";
  const [items, setItems] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"Display" | "Video" | "Mobile">(
    "Mobile",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const baseUrl =
    (import.meta.env as any).VITE_SERVER_URL || window.location.origin;

  const handleDownload = async (item: DemoItem) => {
    if (!item.source || downloadingId) return;
    setDownloadingId(item.id);
    try {
      const res = await fetch(
        `${baseUrl}/api/sftp/download-directory?path=${encodeURIComponent(item.source)}`,
      );
      if (!res.ok) {
        let message = "Download failed";
        try {
          const data = await res.json();
          if (data?.error) message = String(data.error);
        } catch {
          // ignore json parse
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const filename = toSafeZipName(item.title);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const fetchDemos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/creative-demos`);
        const data = await res.json();
        if (!res.ok || !data.ok || !Array.isArray(data.demos)) {
          throw new Error(data.error || "Unable to load creative demos");
        }
        const sortedById = [...data.demos].sort((a: DemoItem, b: DemoItem) => {
          const idA = Number(a.id);
          const idB = Number(b.id);
          if (Number.isNaN(idA) || Number.isNaN(idB)) {
            return String(a.id).localeCompare(String(b.id));
          }
          return idA - idB;
        });
        setItems(sortedById);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load creative demos",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchDemos();
  }, []);

  const filteredData = items.filter((item) => {
    const matchesFilter = item.category === filter;
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="w-full px-8 pt-10 space-y-8">
      <div className="max-w-full mx-auto">
        <header className="mb-10 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  Creative Showcase
                </h1>
              </div>
              <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[9px] ml-4">
                Interactive Ad Format Demos &amp; Specifications
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search formats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#141b2d] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-[#4cceac]/50 transition-all w-64 shadow-xl"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3] group-focus-within:text-[#4cceac] transition-colors" />
              </div>

              <div className="flex items-center gap-2 bg-[#141b2d] p-1.5 rounded-2xl border border-white/5 shadow-xl">
                {(["Display", "Video", "Mobile"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === f
                        ? "bg-[#4cceac] text-[#141b2d] shadow-lg shadow-[#4cceac]/20"
                        : "text-[#a3a3a3] hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#a3a3a3]">
            Loading creative demos...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedData.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className={`group relative bg-[#141b2d] rounded-[2rem] border border-white/5 hover:border-[#4cceac]/30 transition-all duration-500 shadow-2xl ${
                    item.category === "Mobile"
                      ? "overflow-visible"
                      : "overflow-hidden"
                  }`}
                >
                  <div
                    className={
                      item.category === "Mobile"
                        ? "relative overflow-hidden bg-gradient-to-b from-[#080a10] via-[#0d111a] to-[#141b2d] px-2 pt-2 pb-1"
                        : "relative aspect-[16/10] overflow-hidden"
                    }
                  >
                    {item.category === "Mobile" ? (
                      <MobileIphonePreviewWithEmbed
                        item={item}
                        serverApiUrl={baseUrl}
                      />
                    ) : (
                      <>
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141b2d] via-transparent to-transparent opacity-60" />

                        <div className="absolute top-4 left-4">
                          <span className="bg-[#141b2d]/80 backdrop-blur-md border border-white/10 text-[#4cceac] text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                            {item.category}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-black text-white mb-4 tracking-tight uppercase italic group-hover:text-[#4cceac] transition-colors">
                      {item.title}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Square3Stack3DIcon className="w-4 h-4 text-[#a3a3a3]" />
                          <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                            Size
                          </span>
                        </div>
                        <span className="text-xs font-medium text-white">
                          {displayPrimarySize(item)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <AdjustmentsHorizontalIcon className="w-4 h-4 text-[#a3a3a3]" />
                          <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                            Position
                          </span>
                        </div>
                        <span className="text-xs font-medium text-white">
                          {item.position}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <CommandLineIcon className="w-4 h-4 text-[#a3a3a3]" />
                          <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                            File Type
                          </span>
                        </div>
                        <span className="text-xs font-medium text-white">
                          {item.fileType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <VideoCameraIcon className="w-4 h-4 text-[#a3a3a3]" />
                          <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                            Video
                          </span>
                        </div>
                        <span className="text-xs font-medium text-white uppercase">
                          {item.video === "mp4"
                            ? "mp4"
                            : (item.video ?? "none")}
                        </span>
                      </div>
                    </div>

                    {!isAdsop && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            void handleDownload(item);
                          }}
                          disabled={!item.source || downloadingId === item.id}
                          className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl border border-white/10 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          {downloadingId === item.id
                            ? "Downloading..."
                            : "Download"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent to-[#4cceac]/5 pointer-events-none" />
                </motion.div>
              ))}
            </AnimatePresence>
            </div>

          {filteredData.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/80 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                    currentPage === page
                      ? "bg-[#4cceac] text-[#141b2d] shadow-lg shadow-[#4cceac]/20"
                      : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/80 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}

        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[#141b2d] rounded-3xl flex items-center justify-center mb-6 border border-white/5">
              <MagnifyingGlassIcon className="w-10 h-10 text-[#3d465d]" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-2">
              No formats found
            </h3>
            <p className="text-[#a3a3a3] text-sm font-medium">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeShowcase;
