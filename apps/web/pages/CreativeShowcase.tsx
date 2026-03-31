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
import {
  getYomediaDemoPreviewUrl,
  openYomediaDemoPreview,
} from "../components/OpenDemo";
import { type CreativeDemoItem } from "../data/creativeDemos";

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

type DemoItem = CreativeDemoItem;
type CreativeDemosApiResponse = {
  ok?: boolean;
  demos?: unknown[];
};

function normalizeDemo(raw: unknown): DemoItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? "").trim();
  const title = String(item.title ?? "").trim();
  const category = String(item.category ?? "").trim() as DemoItem["category"];
  if (!id || !title || !["Display", "Video", "Mobile"].includes(category)) {
    return null;
  }

  return {
    id,
    title,
    image: String(item.image ?? ""),
    size: item.size as string | string[] | undefined,
    position: String(item.position ?? "-"),
    fileType: String(item.fileType ?? ""),
    value: item.value ? String(item.value) : undefined,
    video: item.video ? String(item.video) : undefined,
    source: item.source ? String(item.source) : undefined,
    status: item.status ? String(item.status) : undefined,
    category,
    fla: typeof item.fla === "boolean" ? item.fla : false,
  };
}

function StatusBarCellularIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M584 352H440c-17.7 0-32 14.3-32 32v544c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32M892 64H748c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32M276 640H132c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V672c0-17.7-14.3-32-32-32" />
    </svg>
  );
}

function StatusBarWifiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M256 96c-81.5 0-163 33.6-221.5 88.3-3.3 3-3.4 8.1-.3 11.4l26.7 27.9c3.1 3.3 8.3 3.4 11.6.3 23.3-21.6 49.9-38.8 79.3-51 33-13.8 68.1-20.7 104.3-20.7s71.3 7 104.3 20.7c29.4 12.3 56 29.4 79.3 51 3.3 3.1 8.5 3 11.6-.3l26.7-27.9c3.1-3.2 3-8.3-.3-11.4C419 129.6 337.5 96 256 96z" />
      <path d="M113.2 277.5l28.6 28.3c3.1 3 8 3.2 11.2.3 28.3-25.1 64.6-38.9 102.9-38.9s74.6 13.7 102.9 38.9c3.2 2.9 8.1 2.7 11.2-.3l28.6-28.3c3.3-3.3 3.2-8.6-.3-11.7-37.5-33.9-87.6-54.6-142.5-54.6s-105 20.7-142.5 54.6c-3.3 3.1-3.4 8.4-.1 11.7z" />
      <path d="M256 324.2c-23.4 0-44.6 9.8-59.4 25.5-3 3.2-2.9 8.1.2 11.2l53.4 52.7c3.2 3.2 8.4 3.2 11.6 0l53.4-52.7c3.1-3.1 3.2-8 .2-11.2-14.8-15.6-36-25.5-59.4-25.5z" />
    </svg>
  );
}

function StatusBarBatteryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M20 8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2h2v-4h-2z" />
    </svg>
  );
}

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
    setIframeLoaded(false);
  }, [iframeSrc]);

  const showPoster = !iframeSrc || !iframeLoaded || urlResolving;

  return (
    <div className="relative mx-auto flex w-full max-w-[240px] flex-col items-center py-4 sm:max-w-[300px]">
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
        className="relative w-full ,inset_0_1px_0_rgba(255,255,255,0.14)]"
        style={{ aspectRatio: "430 / 895" }}
      >
        <div className="absolute inset-0 rounded-[2.35rem] bg-[#3b3b3b] via-[#636366]  p-[2.5%] ring-1 ring-white/15">
          <div className="relative h-full w-full rounded-[2.05rem] bg-[#0c0c0c] p-[2.2%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.78rem] bg-black">
              <div
                className="pointer-events-none absolute left-1/2 top-[1.25%] z-[32] h-[3.4%] min-h-[11px] w-[34%] max-w-[118px] -translate-x-1/2 rounded-full bg-black shadow-[0_4px_14px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)] ring-[0.5px] ring-white/[0.06]"
                aria-hidden
              />

              <div className="relative z-[21] flex w-full shrink-0 items-center bg-white pl-[9%] pr-[5%] pb-1.5 pt-[3.5%] text-[0.7rem] font-semibold leading-none text-black pointer-events-none">
                <span className="tabular-nums shrink-0">9:42</span>
                <span className="min-w-0 flex-1" aria-hidden />
                <div className="flex shrink-0 items-center gap-1 text-black translate-x-0.5">
                  <StatusBarCellularIcon className="h-3.5 w-[1.1rem] shrink-0" />
                  <StatusBarWifiIcon className="h-3.5 w-3.5 shrink-0" />
                  <StatusBarBatteryIcon className="h-3 w-6 shrink-0" />
                </div>
              </div>

              <div className="relative min-h-0 w-full flex-1 bg-white">
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
                    className={`absolute inset-0 z-[2] h-full w-full border-0 bg-white transition-opacity duration-500 ${
                      iframeLoaded && !urlResolving
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                    onLoad={() => setIframeLoaded(true)}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    allow="autoplay; fullscreen; encrypted-media"
                  />
                ) : null}

                {urlResolving ? (
                  <div className="absolute inset-0 z-[14] flex items-center justify-center bg-black/35">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                      Loading demo…
                    </span>
                  </div>
                ) : null}

                {children}
              </div>

              <div className="flex shrink-0 justify-center pb-1.5 pt-1">
                <div className="h-1 w-[28%] max-w-[130px] rounded-full bg-white/90" />
              </div>

              <div className="pointer-events-none absolute inset-0 z-[19] rounded-[1.78rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_20px_40px_-20px_rgba(255,255,255,0.06)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseIphonePreviewWithEmbed({
  item,
  serverApiUrl,
}: {
  item: DemoItem;
  serverApiUrl: string;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [urlResolving, setUrlResolving] = useState(true);
  const isMobileCategory = item.category === "Mobile";

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
          forceDevice: isMobileCategory ? "mb" : "pc",
          serverApiUrl,
        });
        const resolved =
          isMobileCategory && url
            ? url.replace(
                "/site/idmb/index.html",
                "/site/idmb/mobile/index.html",
              )
            : url;
        if (!cancelled) setIframeSrc(resolved);
      } finally {
        if (!cancelled) setUrlResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item.id, item.source, item.value, serverApiUrl, isMobileCategory]);

  return (
    <Iphone16ProMaxShowcaseFrame
      title={item.title}
      posterImage={item.image}
      iframeSrc={iframeSrc}
      urlResolving={urlResolving}
    >
      <div className="pointer-events-none absolute inset-0 z-[25] bg-gradient-to-t from-[#141b2d]/85 via-transparent to-transparent opacity-40" />
      <div className="absolute left-2 right-2 top-2 z-30 flex justify-start pointer-events-none sm:left-3 sm:right-3 sm:top-3">
        <span className="pointer-events-auto rounded-full border border-white/10 bg-[#141b2d]/90 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-[#4cceac] shadow-lg backdrop-blur-md sm:px-3 sm:py-1 sm:text-[8px]">
          {item.category}
        </span>
      </div>
    </Iphone16ProMaxShowcaseFrame>
  );
}

const CreativeShowcase: React.FC = () => {
  const ITEMS_PER_PAGE = 4;
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isRestrictedDownloadRole = role === "adsop" || role === "media";
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

  const handleOpenDemo = async (item: DemoItem) => {
    if (!item.source) return;
    try {
      await openYomediaDemoPreview({
        remotePath: item.source,
        formatValue: item.value,
        forceDevice: item.category === "Display" ? "pc" : "mb",
        serverApiUrl: baseUrl,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to open demo";
      setError(message);
    }
  };

  useEffect(() => {
    const fetchDemos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/creative-demos`);
        if (!res.ok) {
          throw new Error("Unable to load creative demos from server");
        }
        const data = (await res.json()) as CreativeDemosApiResponse;
        const demos = Array.isArray(data?.demos)
          ? data.demos
              .map(normalizeDemo)
              .filter((item): item is DemoItem => Boolean(item))
          : [];
        const sortedById = demos.sort((a: DemoItem, b: DemoItem) => {
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
  }, [baseUrl]);

  const filteredData = items.filter((item) => {
    const matchesFilter = item.category === filter;
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / ITEMS_PER_PAGE),
  );
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
                    className="group relative overflow-visible rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl transition-all duration-500 hover:border-[#4cceac]/30"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-b from-[#080a10] via-[#0d111a] to-[#141b2d] px-2 pt-2 pb-1">
                      <ShowcaseIphonePreviewWithEmbed
                        item={item}
                        serverApiUrl={baseUrl}
                      />
                    </div>

                    <div className="p-6">
                      <h3 className="mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            void handleOpenDemo(item);
                          }}
                          disabled={!item.source}
                          className="text-left text-lg font-black text-white tracking-tight uppercase italic group-hover:text-[#4cceac] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {item.title}
                        </button>
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

                      {!isRestrictedDownloadRole && (
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

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
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
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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
