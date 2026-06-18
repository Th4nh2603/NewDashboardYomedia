import React from "react";
import {
  loadActiveCreativeDemos,
  type CreativeDemoItem,
} from "@/data/creativeDemos";
import { fetchJsonOrThrow } from "@/api/apiError";
import { serverApiOrigin } from "@/api/serverApiOrigin";
import Button from "@/components/common/Button";

/** Last segment counts as a file if it looks like `name.ext` (e.g. `make-vast.xml`, `index.html`). */
export function splitRelativeDemoPath(relativePath: string): {
  dirRel: string;
  fileName: string | null;
} {
  const norm = relativePath.replace(/^\/+|\/+$/g, "");
  if (!norm) return { dirRel: "", fileName: null };
  const segs = norm.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  if (/\.[a-z0-9]{1,12}$/i.test(last)) {
    return {
      dirRel: segs.slice(0, -1).join("/"),
      fileName: last,
    };
  }
  return { dirRel: norm, fileName: null };
}

export type OpenYomediaDemoPreviewParams = {
  /**
   * Relative path under `baseRemotePath`: folder (e.g. `2026/01/cj/tvc/480x270`) or folder + file
   * (e.g. `2026/01/cj/tvc/make-vast.xml`).
   */
  remotePath: string;
  /**
   * Video / VAST preview: `.../idvd/...` by default; with `previewHostTemplate: "tuoitre"` uses `.../ttvd/...`.
   * `f=` must be passed via `formatValue` (creative-demos `value`, e.g. instream, outstream) — no default.
   */
  instreamVideo?: boolean;
  bannerPath?: string;
  formatValue?: string;
  forceDevice?: "pc" | "mb";
  /**
   * Banner HTML preview host under `…/app/template/site/`.
   * `eva` maps Display → `evapc`, Mobile → `evamb`.
   * `tuoitre` maps Display → `ttpc`, Mobile → `ttmb`, video / VAST → `ttvd`.
   */
  previewHostTemplate?: "default" | "eva" | "tuoitre";
  baseRemotePath?: string;
  /** Server base URL with `/api/creative-demos` (same default as the Demo button). */
  serverApiUrl?: string;
  /**
   * Active creative rows (e.g. from Manage/Build). When provided, `f=` inference skips an extra
   * `loadActiveCreativeDemos()` hop; omit until your first catalog fetch finished if the list may be empty.
   */
  creativeDemosForPreview?: CreativeDemoItem[];
  /**
   * Window opened synchronously on click (e.g. `about:blank`), then navigate after SFTP resolves —
   * avoids popup blocking `window.open` after `await`.
   */
  targetWindow?: Window | null;
};

/** SFTP full path → relative segment under `baseRemotePath` (used for `b=` and public demo URLs). */
export function buildDemoRemoteRelativePath(
  fullPath: string,
  baseRemotePath: string,
) {
  if (fullPath.startsWith(baseRemotePath)) {
    return fullPath.slice(baseRemotePath.length).replace(/^\/+/, "");
  }
  return fullPath.replace(/^\/+/, "");
}

function extractSizeFromPath(relativePath: string) {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.find((s) => /^\d{2,4}x\d{2,4}$/i.test(s)) ?? null;
}

function extractSizeFromJsFilename(fileName: string) {
  const match = fileName
    .trim()
    .toLowerCase()
    .match(/^(\d{2,4}x\d{2,4})\.js$/i);
  return match?.[1] ?? null;
}

function toSftpDirectoryPath(remotePath: string, baseRemotePath: string) {
  const trimmed = remotePath.trim();
  if (!trimmed) return null;

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  const noTrailingSlash = withoutQuery.replace(/\/+$/, "");
  const noLeadingSlash = noTrailingSlash.replace(/^\/+/, "");
  const normalizedBase = baseRemotePath.replace(/\/+$/, "");

  if (!noLeadingSlash) return normalizedBase || "/";

  if (noTrailingSlash.startsWith("/")) {
    if (noTrailingSlash.startsWith(`${normalizedBase}/`))
      return noTrailingSlash;
    if (noTrailingSlash === normalizedBase) return noTrailingSlash;
    return `${normalizedBase}/${noLeadingSlash}`;
  }

  return `${normalizedBase}/${noLeadingSlash}`;
}

async function getSizeFromSftpDirectory(
  remotePath: string,
  baseRemotePath: string,
  serverApiUrl: string,
) {
  const directoryPath = toSftpDirectoryPath(remotePath, baseRemotePath);
  if (!directoryPath) return null;

  try {
    const data = await fetchJsonOrThrow<{
      ok?: boolean;
      entries?: Array<{ name?: string; type?: string }>;
    }>(
      `${serverApiUrl}/api/sftp/list?path=${encodeURIComponent(directoryPath)}`,
    );
    if (!data?.ok || !Array.isArray(data?.entries)) return null;

    const entries = data.entries as Array<{ name?: string; type?: string }>;
    for (const entry of entries) {
      if (entry?.type === "d") continue;
      const size = extractSizeFromJsFilename(String(entry?.name ?? ""));
      if (size) return size;
    }
  } catch {
    // Keep old fallback flow if SFTP list fails.
  }

  return null;
}

function sizeMatches(itemSize: unknown, targetSize: string) {
  if (!itemSize) return false;
  if (Array.isArray(itemSize)) {
    return itemSize.some(
      (s) => String(s).toLowerCase() === targetSize.toLowerCase(),
    );
  }
  const value = String(itemSize).toLowerCase();
  return (
    value === targetSize.toLowerCase() ||
    value.includes(targetSize.toLowerCase())
  );
}

function fallbackFormatBySize(
  size: string,
  demos?: Array<{ size?: unknown; value?: string; category?: string }>,
) {
  const key = size.toLowerCase();
  const match = (demos ?? []).find((item) => {
    if (!item?.value) return false;
    const raw = item.size;
    if (Array.isArray(raw)) {
      return raw.some(
        (entry) =>
          String(entry ?? "")
            .trim()
            .toLowerCase() === key,
      );
    }
    return (
      String(raw ?? "")
        .trim()
        .toLowerCase() === key
    );
  });
  if (match?.value) return match.value;
  return "inpage-mb";
}

function inferDeviceByCategory(
  category: string | null | undefined,
): "pc" | "mb" {
  const key = String(category ?? "")
    .trim()
    .toLowerCase();
  if (key === "display") return "pc";
  if (key === "mobile") return "mb";
  return "mb";
}

function inferPreviewSiteByCategory(category: string | null | undefined) {
  const key = String(category ?? "")
    .trim()
    .toLowerCase();
  if (key === "video") return "idvd" as const;
  if (key === "display") return "idpc" as const;
  if (key === "mobile") return "idmb" as const;
  return "idmb" as const;
}

async function getFormatFromCatalogValue(
  formatValue: string | null | undefined,
  preloadedActiveDemos?: CreativeDemoItem[],
) {
  const format = String(formatValue ?? "").trim();
  if (!format) {
    return {
      format: "inpage-mb",
      device: "mb" as const,
      category: null as string | null,
      previewSite: "idmb" as const,
      entryFile: "index.html",
    };
  }

  const demos =
    preloadedActiveDemos !== undefined
      ? preloadedActiveDemos
      : await loadActiveCreativeDemos();
  const row = demos.find((item) => String(item.value ?? "").trim() === format);
  const category = row?.category ? String(row.category) : null;
  const deviceByCategory = inferDeviceByCategory(row?.category);
  const device = format.includes("-pc") ? "pc" : deviceByCategory;
  const previewSite = category
    ? inferPreviewSiteByCategory(category)
    : device === "pc"
      ? ("idpc" as const)
      : ("idmb" as const);

  return {
    format,
    device: device as "mb" | "pc",
    category,
    previewSite,
    entryFile: (row?.file ?? "").trim() || "index.html",
  };
}

async function getFormatFromData(
  size: string | null,
  preloadedActiveDemos?: CreativeDemoItem[],
) {
  if (!size)
    return {
      format: "inpage-mb",
      device: "mb" as const,
      category: null as string | null,
      previewSite: "idmb" as const,
      entryFile: "index.html",
    };

  const demos =
    preloadedActiveDemos !== undefined
      ? preloadedActiveDemos
      : await loadActiveCreativeDemos();

  const foundBySize = demos.find((item) => {
    const sizes: unknown[] = [];
    const raw = item.size;
    if (Array.isArray(raw)) {
      raw.forEach((x) => {
        if (x !== undefined && x !== null && String(x).trim() !== "")
          sizes.push(x);
      });
    } else if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      sizes.push(raw);
    }
    return sizes.some((s) => sizeMatches(s, size)) && Boolean(item.value);
  });

  const format = foundBySize?.value || fallbackFormatBySize(size, demos);
  const category = foundBySize?.category ? String(foundBySize.category) : null;
  const deviceByCategory = inferDeviceByCategory(foundBySize?.category);
  const device = format.includes("-pc") ? "pc" : deviceByCategory;
  const previewSite = inferPreviewSiteByCategory(foundBySize?.category);
  const entryFile = (foundBySize?.file ?? "").trim() || "index.html";
  return {
    format,
    device: device as "mb" | "pc",
    category,
    previewSite,
    entryFile,
  };
}

/** demo.yomedia.vn preview URL (`f=`, `b=`, …) — same logic as the Demo button. */
export async function getYomediaDemoPreviewUrl(
  params: OpenYomediaDemoPreviewParams,
): Promise<string | null> {
  const baseRemotePath = params.baseRemotePath ?? "/script/demo";
  const serverApiUrl = params.serverApiUrl ?? serverApiOrigin();

  const hasPath = Boolean(
    (params.bannerPath ?? params.remotePath ?? "").trim(),
  );
  if (!hasPath) return null;

  const relative = buildDemoRemoteRelativePath(
    params.remotePath.trim(),
    baseRemotePath,
  );
  const { dirRel, fileName } = splitRelativeDemoPath(relative);
  const relativeForFolder = fileName !== null ? dirRel : relative;

  const sizeFromSftp = await getSizeFromSftpDirectory(
    relativeForFolder,
    baseRemotePath,
    serverApiUrl,
  );
  const provisionalPath = (() => {
    if (!relative) return relative;
    if (/\.html?$/i.test(relative)) return relative.replace(/\/+$/, "");
    if (fileName !== null) {
      const d = dirRel.replace(/\/+$/, "");
      return d ? `${d}/index.html` : "index.html";
    }
    return relative && !/\.html?$/i.test(relative)
      ? `${relative.replace(/\/+$/, "")}/index.html`
      : relative.replace(/\/+$/, "");
  })();
  const size =
    sizeFromSftp ??
    extractSizeFromPath(relativeForFolder) ??
    extractSizeFromPath(provisionalPath);

  const resolved = params.formatValue?.trim()
    ? await getFormatFromCatalogValue(
        params.formatValue,
        params.creativeDemosForPreview,
      )
    : await getFormatFromData(size, params.creativeDemosForPreview);
  const {
    format: formatParam,
    device,
    category,
    previewSite,
    entryFile,
  } = resolved;

  const computedBannerPath = params.bannerPath?.trim()
    ? params.bannerPath.trim().replace(/^\/+/, "")
    : relative
      ? fileName !== null
        ? relative.replace(/\/+$/, "")
        : /\.html?$/i.test(relative)
          ? relative.replace(/\/+$/, "")
          : `${relative.replace(/\/+$/, "")}/${entryFile}`
      : entryFile;

  const tmpl = params.previewHostTemplate ?? "default";
  const shouldUseVideoSite =
    params.instreamVideo || previewSite === "idvd" || category === "Video";
  if (shouldUseVideoSite) {
    const vastRel = params.bannerPath?.trim()
      ? params.bannerPath.trim().replace(/^\/+/, "")
      : fileName !== null && /\.(xml|xaml)$/i.test(fileName)
        ? relative.replace(/\/+$/, "")
        : `${relative.replace(/\/+$/, "")}/make-vast.xml`;
    const videoSite = tmpl === "tuoitre" ? "ttvd" : "idvd";
    const previewBase = `https://demo.yomedia.vn/yomedia/app/template/site/${videoSite}/index.html`;
    return `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(vastRel)}&l=${encodeURIComponent("null")}&c=demo`;
  }

  const effectiveDevice = params.forceDevice ?? device;
  const isPcFormat = effectiveDevice === "pc";
  const siteSegment =
    tmpl === "eva"
      ? isPcFormat
        ? "evapc"
        : "evamb"
      : tmpl === "tuoitre"
        ? isPcFormat
          ? "ttpc"
          : "ttmb"
        : isPcFormat
          ? "idpc"
          : "idmb";
  /** PC/Mobile segment under `…/app/template/site/` per template. */
  const previewBase = `https://demo.yomedia.vn/yomedia/app/template/site/${siteSegment}/index.html`;
  return `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(computedBannerPath)}&l=lt&c=demo`;
}

/** Opens demo.yomedia.vn preview tab with `b=` pointing at banner folder/file (same as Demo button). */
export async function openYomediaDemoPreview(
  params: OpenYomediaDemoPreviewParams,
) {
  const { targetWindow, ...urlParams } = params;
  const url = await getYomediaDemoPreviewUrl(urlParams);
  if (!url) {
    targetWindow?.close();
    return;
  }
  const tab = targetWindow;
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

type OpenDemoButtonProps = {
  /**
   * Relative path under demo root: folder or `folder/file.ext` (e.g. `2026/01/cj/tvc/make-vast.xml`).
   */
  remotePath: string;
  instreamVideo?: boolean;
  /** Pass through `b=` query if you already have it */
  bannerPath?: string;
  /** Pass through `f=` query if you already have it */
  formatValue?: string;
  /** Force preview site: `pc` -> idpc, `mb` -> idmb */
  forceDevice?: "pc" | "mb";
  previewHostTemplate?: "default" | "eva" | "tuoitre";
  baseRemotePath?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
};

const OpenDemoButton: React.FC<OpenDemoButtonProps> = ({
  remotePath,
  instreamVideo,
  bannerPath,
  formatValue,
  forceDevice,
  previewHostTemplate,
  baseRemotePath = "/script/demo",
  className = "px-4 py-2.5 rounded-2xl bg-[#4cceac] text-[#020617] text-xs font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed",
  label = "demo",
  disabled = false,
}) => {
  const serverApiUrl = serverApiOrigin();

  const handleOpenDemo = React.useCallback(async () => {
    const hasPath = Boolean((bannerPath ?? remotePath).trim());
    if (disabled || !hasPath) return;

    await openYomediaDemoPreview({
      remotePath: remotePath.trim(),
      instreamVideo,
      bannerPath,
      formatValue,
      forceDevice,
      previewHostTemplate,
      baseRemotePath,
      serverApiUrl,
    });
  }, [
    disabled,
    bannerPath,
    instreamVideo,
    forceDevice,
    previewHostTemplate,
    formatValue,
    remotePath,
    baseRemotePath,
    serverApiUrl,
  ]);

  return (
    <Button
      type="button"
      onClick={handleOpenDemo}
      disabled={disabled || !(bannerPath ?? remotePath).trim()}
      className={className}
    >
      {label}
    </Button>
  );
};

export default OpenDemoButton;
