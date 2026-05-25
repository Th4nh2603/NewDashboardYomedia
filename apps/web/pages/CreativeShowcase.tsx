import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import Button from "../components/Button";
import { type CreativeDemoItem } from "../data/creativeDemos";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";
import { api } from "../lib/trpc/api";
import { fetchWithApiAuth } from "../lib/apiAuth";
import { recordActivity } from "../lib/activityLog";
import { serverApiOrigin } from "../lib/serverApiOrigin";

/** Preview cell aspect ratio: tighter on mobile + laptop (lg); full phone ratio again from xl up. */
const SHOWCASE_PREVIEW_ASPECT_CLASS =
  "aspect-[375/700] lg:aspect-[375/472] xl:aspect-[375/700]";

/** Display on grid tile: shorter on laptop; xl+ restores 375/700 ratio. */
const SHOWCASE_DISPLAY_GRID_ASPECT_CLASS =
  "aspect-[375/340] lg:aspect-[375/265] xl:aspect-[375/700]";

const SHOWCASE_DEVICE_OUTER_CLASS =
  "relative mx-auto flex w-full max-w-[296px] flex-col items-center py-3 sm:py-4 sm:max-w-[340px] lg:max-w-[328px] lg:py-2 " +
  "xl:max-w-[367px] xl:py-4";

/** Reference width (phone preview) — only used to size Display height when the card spans full tile width. */
const SHOWCASE_DEVICE_HEIGHT_REF_WIDTH_CLASS =
  "mx-auto w-full max-w-[296px] sm:max-w-[340px] lg:max-w-[328px] xl:max-w-[367px]";

/** Display lightbox sizing: stepped sm→lg for laptop; xl+ ~2/3 viewport like legacy. */
const DISPLAY_HOVER_OVERLAY_BOX_CLASS =
  "relative box-border overflow-hidden rounded-xl border border-slate-300/80 bg-slate-950 shadow-2xl sm:rounded-2xl dark:border-white/15 dark:bg-black " +
  "h-[min(58vh,calc(100vh-1.25rem))] w-[min(94vw,calc(100vw-1rem))] " +
  "sm:h-[min(62vh,calc(100vh-1.5rem))] sm:w-[min(90vw,calc(100vw-1.5rem))] " +
  "md:h-[min(64vh,calc(100vh-2rem))] md:w-[min(72vw,calc(100vw-2rem))] " +
  "lg:h-[min(63vh,calc(100vh-2.5rem))] lg:w-[min(68vw,calc(100vw-2rem))] " +
  "xl:h-[min(66.6667vh,calc(100vh-2rem))] xl:w-[min(66.6667vw,calc(100vw-2rem))] xl:rounded-2xl";

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
    file: item.file ? String(item.file).trim() || undefined : undefined,
    value: item.value ? String(item.value) : undefined,
    video: item.video ? String(item.video) : undefined,
    source: item.source ? String(item.source) : undefined,
    status: item.status ? String(item.status) : undefined,
    category,
    fla: typeof item.fla === "boolean" ? item.fla : false,
  };
}

type ShowcaseFilter =
  | "All"
  | "Display"
  | "Video"
  | "Mobile"
  | "Masthead"
  | "FirstView";

const SHOWCASE_FILTERS = [
  "All",
  "Display",
  "Video",
  "Mobile",
  "Masthead",
  "FirstView",
] as const satisfies readonly ShowcaseFilter[];

function foldTitleForKeywordMatch(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesShowcaseFilter(
  item: DemoItem,
  filter: ShowcaseFilter,
): boolean {
  if (filter === "All") return true;
  if (filter === "Masthead")
    return foldTitleForKeywordMatch(item.title).includes("masthead");
  if (filter === "FirstView")
    return foldTitleForKeywordMatch(item.title).includes("firstview");
  return item.category === filter;
}

type ShowcasePermissionMap = Record<
  string,
  { creativeShowcase?: { canDownload?: boolean } } | undefined
>;

/** Aligns with server + `creativeShowcaseDownload.ts` when optional keys are omitted. */
function resolveCreativeShowcaseDownload(
  permissions: ShowcasePermissionMap,
  roleRaw: string,
): boolean {
  const r = roleRaw.trim().toLowerCase();
  if (!r) return false;
  const forRole = permissions[r]?.creativeShowcase?.canDownload;
  if (forRole === true) return true;
  if (forRole === false) return false;
  const defaultRaw = permissions.default?.creativeShowcase?.canDownload;
  if (defaultRaw === true) return true;
  if (defaultRaw === false) return false;
  return r !== "media";
}

type ShowcasePermissionsPayload = Partial<{
  ok: boolean;
  permissions?: ShowcasePermissionMap;
}>;

const LOADING_DEMO_LABEL = "Loading demo…";

function CategoryBadge({
  category,
  size = "default",
  className = "",
}: {
  category: string;
  size?: "default" | "large";
  className?: string;
}) {
  const sizeClass =
    size === "large"
      ? "px-2.5 py-0.5 text-[8px] sm:px-3 sm:py-1 sm:text-[9px]"
      : "px-2.5 py-0.5 text-[7px] sm:px-3 sm:py-1 sm:text-[8px]";
  return (
    <span
      className={`inline-flex rounded-full border border-slate-200/90 bg-white/95 font-black uppercase tracking-widest text-emerald-700 shadow-sm backdrop-blur-md dark:border-white/[0.12] dark:bg-[#141b2d]/92 dark:text-[#4cceac] dark:shadow-[0_2px_14px_rgba(0,0,0,0.4)] ${sizeClass} ${className}`}
    >
      {category}
    </span>
  );
}

function ShowcaseGridSkeleton({ columns3 }: { columns3: boolean }) {
  return (
    <div
      className={`grid gap-4 sm:gap-5 lg:gap-6 xl:gap-6 ${
        columns3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      }`}
    >
      {[0, 1, 2].map((k) => (
        <div
          key={`sk-${k}`}
          className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-lg dark:border-white/5 dark:bg-[#141b2d]/90 dark:shadow-xl"
        >
          <div className="aspect-[375/472] animate-pulse bg-gradient-to-b from-slate-200/50 to-slate-100/80 sm:aspect-[375/340] dark:from-white/[0.06] dark:to-white/[0.02]" />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="h-5 w-[72%] animate-pulse rounded-lg bg-slate-200/80 dark:bg-white/[0.08]" />
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[3.25rem] animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]"
                />
              ))}
            </div>
            <div className="h-10 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
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
    <div className={SHOWCASE_DEVICE_OUTER_CLASS}>
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

      <div className={`relative w-full ${SHOWCASE_PREVIEW_ASPECT_CLASS}`}>
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
                    className={`absolute inset-0 z-[2] h-full w-full overflow-x-hidden border-0 bg-white transition-opacity duration-500 ${
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
                      {LOADING_DEMO_LABEL}
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
  onPreviewOpen,
}: {
  item: DemoItem;
  serverApiUrl: string;
  onPreviewOpen?: (item: DemoItem) => void;
}) {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [urlResolving, setUrlResolving] = useState(true);
  const [displayLightboxOpen, setDisplayLightboxOpen] = useState(false);
  const isMobileCategory = item.category === "Mobile";
  const useDisplaySizePreview = item.category === "Display";

  const openDisplayLightbox = useCallback(() => {
    onPreviewOpen?.(item);
    setDisplayLightboxOpen(true);
  }, [item, onPreviewOpen]);

  const closeDisplayLightbox = useCallback(() => {
    setDisplayLightboxOpen(false);
  }, []);

  useEffect(() => {
    if (!displayLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDisplayLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [displayLightboxOpen, closeDisplayLightbox]);

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

  if (useDisplaySizePreview) {
    const renderDisplayPreview = (opts: { thumbSurface: boolean }) => (
      <>
        <img
          src={item.image}
          alt=""
          className={`absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-500 ${
            !iframeSrc || urlResolving
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          referrerPolicy="no-referrer"
        />
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            title={item.title}
            className={`absolute inset-0 z-[2] h-full w-full overflow-x-hidden border-0 bg-white transition-opacity duration-500 ${
              !urlResolving ? "opacity-100" : "opacity-0"
            } ${opts.thumbSurface ? "pointer-events-none" : ""}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            allow="autoplay; fullscreen; encrypted-media"
          />
        ) : null}
        {urlResolving ? (
          <div className="absolute inset-0 z-[14] flex items-center justify-center bg-black/35">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
              {LOADING_DEMO_LABEL}
            </span>
          </div>
        ) : null}
      </>
    );

    const lightboxPortal =
      displayLightboxOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[500] flex items-center justify-center bg-black/[0.58] p-3 backdrop-blur-sm sm:p-4 lg:p-6 xl:p-4"
              onClick={closeDisplayLightbox}
              role="presentation"
            >
              <div
                className={`${DISPLAY_HOVER_OVERLAY_BOX_CLASS} cursor-default`}
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="relative h-full w-full">
                  {renderDisplayPreview({ thumbSurface: false })}
                </div>
                <div className="pointer-events-none absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
                  <CategoryBadge category={item.category} size="large" />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null;

    return (
      <div className="relative w-full py-3 sm:py-4 lg:py-1.5 xl:py-4">
        {lightboxPortal}
        <div className="relative w-full">
          <div
            className={`${SHOWCASE_DEVICE_HEIGHT_REF_WIDTH_CLASS} pointer-events-none select-none`}
            aria-hidden
          >
            <div className={`w-full ${SHOWCASE_DISPLAY_GRID_ASPECT_CLASS}`} />
          </div>
          <div className="absolute inset-0 z-0">
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-md dark:border-white/10 dark:bg-black dark:shadow-[0_14px_32px_rgba(0,0,0,0.4)]">
              {renderDisplayPreview({ thumbSurface: true })}
              <Button
                type="button"
                aria-label="Open large view"
                className="absolute inset-0 z-[16] cursor-pointer bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openDisplayLightbox();
                }}
              />
            </div>
            <div className="pointer-events-none absolute left-2 top-2 z-30 sm:left-3 sm:top-3">
              <CategoryBadge category={item.category} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Iphone16ProMaxShowcaseFrame
      title={item.title}
      posterImage={item.image}
      iframeSrc={iframeSrc}
      urlResolving={urlResolving}
    >
      <div className="pointer-events-none absolute inset-0 z-[25] bg-gradient-to-t from-slate-900/25 via-transparent to-transparent opacity-40 dark:from-[#141b2d]/85" />
      <div className="absolute left-2 right-2 top-2 z-30 flex justify-start pointer-events-none sm:left-3 sm:right-3 sm:top-3">
        <CategoryBadge category={item.category} className="pointer-events-auto" />
      </div>
    </Iphone16ProMaxShowcaseFrame>
  );
}

const SHOWCASE_ITEMS_PER_PAGE_DEFAULT = 4;
const SHOWCASE_ITEMS_PER_PAGE_THREE_COL = 3;

const CreativeShowcase: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const [rolePermissions, setRolePermissions] = useState<ShowcasePermissionMap>(
    {},
  );
  const [rolePermissionsLoaded, setRolePermissionsLoaded] = useState(false);
  const [items, setItems] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShowcaseFilter>("Mobile");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const usesThreeColumnPage =
    filter === "All" ||
    filter === "Display" ||
    filter === "Mobile" ||
    filter === "Masthead" ||
    filter === "FirstView";
  const itemsPerPage = usesThreeColumnPage
    ? SHOWCASE_ITEMS_PER_PAGE_THREE_COL
    : SHOWCASE_ITEMS_PER_PAGE_DEFAULT;

  const baseUrl = serverApiOrigin();

  const canDownloadCreativeDemos = useMemo(() => {
    if (!rolePermissionsLoaded) return false;
    return resolveCreativeShowcaseDownload(rolePermissions, role);
  }, [rolePermissions, rolePermissionsLoaded, role]);

  const handlePreviewOpen = useCallback(
    (item: DemoItem) => {
      void recordActivity({
        user,
        action: "preview_creative",
        area: "Creative",
        description: "Opened creative preview lightbox",
        target: item.title,
        metadata: {
          demoId: item.id,
          category: item.category,
          source: item.source,
        },
      });
    },
    [user],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.permissions.get();
        if (!cancelled) {
          setRolePermissions(data.permissions ?? {});
          setRolePermissionsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setRolePermissions({});
          setRolePermissionsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const handleDownload = useCallback(
    async (item: DemoItem) => {
      if (!item.source || downloadingId || !canDownloadCreativeDemos || !role) return;
      setDownloadingId(item.id);
      try {
        const res = await fetchWithApiAuth(
          `${baseUrl}/api/sftp/download-directory?path=${encodeURIComponent(item.source)}`,
        );
        if (!res.ok) {
          throw await backendErrorFromResponse(res);
        }

        const blob = await res.blob();
        const filename = toSafeZipName(item.title);

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        void recordActivity({
          user,
          action: "download_creative",
          area: "Creative",
          description: "Downloaded creative demo package",
          target: item.title,
          metadata: {
            demoId: item.id,
            category: item.category,
            source: item.source,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Download failed";
        setError(message);
      } finally {
        setDownloadingId(null);
      }
    },
    [baseUrl, canDownloadCreativeDemos, downloadingId, role, user],
  );

  const handleOpenDemo = useCallback(
    async (item: DemoItem) => {
      if (!item.source) return;
      try {
        await openYomediaDemoPreview({
          remotePath: item.source,
          formatValue: item.value,
          forceDevice: item.category === "Display" ? "pc" : "mb",
          serverApiUrl: baseUrl,
        });
        void recordActivity({
          user,
          action: "open_creative_demo",
          area: "Creative",
          description: "Opened creative demo preview",
          target: item.title,
          metadata: {
            demoId: item.id,
            category: item.category,
            source: item.source,
            forceDevice: item.category === "Display" ? "pc" : "mb",
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to open demo";
        setError(message);
      }
    },
    [baseUrl, user],
  );

  useEffect(() => {
    const fetchDemos = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.creative.demos();
        const demos = Array.isArray(data?.demos)
          ? data.demos
              .map(normalizeDemo)
              .filter((item): item is DemoItem => Boolean(item))
          : [];
        const sortedById = [...demos].sort((a: DemoItem, b: DemoItem) => {
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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredData = useMemo(
    () =>
      items.filter((item) => {
        if (!matchesShowcaseFilter(item, filter)) return false;
        if (!normalizedQuery) return true;
        return item.title.toLowerCase().includes(normalizedQuery);
      }),
    [items, filter, normalizedQuery],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredData.length / itemsPerPage)),
    [filteredData.length, itemsPerPage],
  );

  const paginatedData = useMemo(
    () =>
      filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
    [filteredData, currentPage, itemsPerPage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="w-full space-y-6 px-4 sm:space-y-7 sm:px-6 lg:space-y-8 lg:px-6 xl:space-y-8 xl:px-8">
      <div className="relative max-w-full mx-auto">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[min(92vw,42rem)] -translate-x-1/2 rounded-full bg-[#4cceac]/[0.12] blur-3xl dark:bg-[#4cceac]/[0.07]"
          aria-hidden
        />
        <header className="relative mb-8 sm:mb-10 xl:mb-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between xl:flex-row xl:items-center xl:justify-between xl:gap-6">
            <div className="min-w-0 shrink">
              <div className="mb-1 flex items-center gap-2 sm:gap-3 xl:gap-3">
                <div className="h-5 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-[#4cceac] to-[#4cceac]/55 shadow-[0_0_12px_rgba(76,206,172,0.45)] sm:h-6 sm:w-1 xl:h-6 xl:w-1" />
                <h1 className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-2xl font-black uppercase italic tracking-tighter text-transparent drop-shadow-sm dark:from-white dark:via-white dark:to-white/75 dark:drop-shadow-[0_1px_24px_rgba(255,255,255,0.06)] sm:text-3xl xl:text-[2rem]">
                  Creative
                </h1>
              </div>
              <p className="ml-0 max-w-xl text-[8px] font-medium uppercase leading-relaxed tracking-widest text-slate-500 sm:ml-4 sm:text-[9px] xl:ml-4 xl:text-[9px] dark:text-[#8e97a8]">
                Interactive Ad Format Demos &amp; Specifications
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:max-w-none lg:flex-nowrap xl:flex-row xl:flex-wrap xl:items-center xl:gap-4">
              <div className="relative group w-full min-w-0 sm:w-52 sm:max-w-[13.5rem] lg:w-56 xl:w-64 xl:max-w-none xl:flex-none">
                <input
                  type="text"
                  placeholder="Search formats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#4cceac]/50 focus:ring-1 focus:ring-[#4cceac]/25 sm:py-3 sm:pl-10 sm:pr-4 xl:py-3 xl:pl-10 xl:pr-4 dark:border-white/[0.07] dark:bg-[#141b2d]/95 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:placeholder:text-[#6b7289] dark:focus:border-[#4cceac]/45"
                />
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600 sm:left-3 xl:left-3 dark:text-[#a3a3a3] dark:group-focus-within:text-[#4cceac]" />
              </div>

              <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm sm:mx-0 sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:p-1.5 lg:flex-nowrap lg:gap-2 xl:mx-0 xl:flex-wrap xl:gap-2 xl:overflow-visible xl:p-1.5 dark:border-white/[0.07] dark:bg-[#141b2d]/95 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-white/18">
                {SHOWCASE_FILTERS.map((f) => (
                  <Button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all duration-200 sm:rounded-xl sm:px-3 sm:text-[10px] lg:px-3.5 xl:rounded-xl xl:px-4 xl:py-1.5 xl:text-[10px] ${
                      filter === f
                        ? "bg-[#4cceac] text-[#141b2d] shadow-lg shadow-[#4cceac]/25 ring-1 ring-white/10"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#9ca6b8] dark:hover:bg-white/[0.04] dark:hover:text-white"
                    }`}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 left-0 h-px w-full bg-gradient-to-r from-[#4cceac]/55 via-slate-300/90 to-transparent dark:via-[#3d465d]/80" />
        </header>

        {error && (
          <div
            className="mb-4 flex gap-3 rounded-2xl border border-rose-300/80 bg-gradient-to-br from-rose-50 to-white px-4 py-3 text-xs leading-relaxed text-rose-800 shadow-sm dark:border-rose-500/35 dark:from-rose-500/[0.12] dark:to-rose-600/[0.06] dark:text-rose-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="alert"
          >
            <span
              className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.6)]"
              aria-hidden
            />
            <span>{error}</span>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="py-6">
            <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#6b7588]">
              Loading creative demos
            </p>
            <ShowcaseGridSkeleton columns3={usesThreeColumnPage} />
          </div>
        ) : (
          <>
            <div
              className={`grid gap-4 sm:gap-5 lg:gap-6 xl:gap-6 ${
                usesThreeColumnPage
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
              }`}
            >
              <AnimatePresence mode="popLayout">
                {paginatedData.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="group/card relative overflow-visible rounded-[2rem] border border-slate-200/90 bg-gradient-to-b from-white via-slate-50 to-slate-100/95 shadow-[0_22px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#4cceac]/35 hover:shadow-[0_28px_60px_-15px_rgba(76,206,172,0.18)] dark:border-white/[0.06] dark:from-[#171f2f] dark:via-[#141b2d] dark:to-[#121827] dark:shadow-[0_22px_50px_-12px_rgba(0,0,0,0.55)] dark:ring-white/[0.03] dark:hover:border-[#4cceac]/28 dark:hover:shadow-[0_28px_60px_-15px_rgba(76,206,172,0.12)]"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-b from-slate-100/95 via-slate-50 to-white px-1.5 pt-1.5 pb-1 sm:px-2 sm:pt-2 lg:px-1.5 lg:pt-0.5 lg:pb-0 xl:px-2 xl:pt-2 xl:pb-1 dark:from-[#080a10]/95 dark:via-[#0d111a] dark:to-[#141b2d]/98">
                      <ShowcaseIphonePreviewWithEmbed
                        item={item}
                        serverApiUrl={baseUrl}
                        onPreviewOpen={handlePreviewOpen}
                      />
                    </div>

                    <div className="p-4 sm:p-5 lg:p-6 xl:p-6">
                      <h3 className="mb-3 sm:mb-4 xl:mb-4">
                        <Button
                          type="button"
                          onClick={() => {
                            void handleOpenDemo(item);
                          }}
                          disabled={!item.source}
                          className="text-left text-base font-black uppercase italic tracking-tight text-slate-900 transition-colors duration-200 group-hover/card:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg xl:text-lg dark:text-white dark:group-hover/card:text-[#4cceac]"
                        >
                          {item.title}
                        </Button>
                      </h3>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 shadow-sm transition-colors duration-200 group-hover/card:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:group-hover/card:border-white/10">
                          <div className="flex items-center gap-2">
                            <Square3Stack3DIcon className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover/card:text-emerald-600 dark:text-[#7c8799] dark:group-hover/card:text-[#4cceac]/85" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-[#a3a3a3]">
                              Size
                            </span>
                          </div>
                          <span className="mt-1 block text-xs font-medium text-slate-900 dark:text-white">
                            {displayPrimarySize(item)}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 shadow-sm transition-colors duration-200 group-hover/card:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:group-hover/card:border-white/10">
                          <div className="flex items-center gap-2">
                            <AdjustmentsHorizontalIcon className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover/card:text-emerald-600 dark:text-[#7c8799] dark:group-hover/card:text-[#4cceac]/85" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-[#a3a3a3]">
                              Position
                            </span>
                          </div>
                          <span className="mt-1 block text-xs font-medium text-slate-900 dark:text-white">
                            {item.position}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 shadow-sm transition-colors duration-200 group-hover/card:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:group-hover/card:border-white/10">
                          <div className="flex items-center gap-2">
                            <CommandLineIcon className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover/card:text-emerald-600 dark:text-[#7c8799] dark:group-hover/card:text-[#4cceac]/85" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-[#a3a3a3]">
                              File Type
                            </span>
                          </div>
                          <span className="mt-1 block text-xs font-medium text-slate-900 dark:text-white">
                            {item.fileType}
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 shadow-sm transition-colors duration-200 group-hover/card:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:group-hover/card:border-white/10">
                          <div className="flex items-center gap-2">
                            <VideoCameraIcon className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover/card:text-emerald-600 dark:text-[#7c8799] dark:group-hover/card:text-[#4cceac]/85" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-[#a3a3a3]">
                              Video
                            </span>
                          </div>
                          <span className="mt-1 block text-xs font-medium uppercase text-slate-900 dark:text-white">
                            {item.video === "mp4"
                              ? "mp4"
                              : (item.video ?? "none")}
                          </span>
                        </div>
                      </div>

                      {canDownloadCreativeDemos && (
                        <div className="mt-4">
                          <Button
                            type="button"
                            onClick={() => {
                              void handleDownload(item);
                            }}
                            disabled={!item.source || downloadingId === item.id}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-100 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm transition-all duration-200 hover:border-[#4cceac]/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 group-hover/card:border-emerald-300/60 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:border-white/15 dark:hover:bg-white/[0.09] dark:group-hover/card:border-[#4cceac]/25"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            {downloadingId === item.id
                              ? "Downloading..."
                              : "Download"}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 bg-gradient-to-br from-transparent via-transparent to-[#4cceac]/[0.12] dark:to-[#4cceac]/[0.08]" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredData.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8 xl:mt-8">
                <Button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:text-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Prev
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                        currentPage === page
                          ? "bg-[#4cceac] text-[#141b2d] shadow-lg shadow-[#4cceac]/20"
                          : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                      }`}
                    >
                      {page}
                    </Button>
                  ),
                )}

                <Button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 dark:text-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {filteredData.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[1.65rem] border border-slate-200/90 bg-gradient-to-br from-white to-slate-100 shadow-md dark:border-white/[0.08] dark:from-[#141b2d] dark:to-[#0d1320] dark:shadow-[0_14px_40px_-12px_rgba(0,0,0,0.5)]">
              <MagnifyingGlassIcon className="h-11 w-11 text-emerald-500/70 dark:text-[#4cceac]/45" strokeWidth={1.25} />
            </div>
            <h3 className="mb-2 text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              No formats found
            </h3>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500 dark:text-[#8e97a8]">
              Try another keyword or switch the category filter above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeShowcase;
