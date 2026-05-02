import React from "react";
import { loadActiveCreativeDemos } from "../data/creativeDemos";
import { fetchJsonOrThrow } from "../lib/apiError";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import Button from './Button';

export type OpenYomediaDemoPreviewParams = {
  /** Relative path (e.g. `2026/03/.../480x270`) or full path under `/script/demo`. */
  remotePath: string;
  bannerPath?: string;
  formatValue?: string;
  forceDevice?: "pc" | "mb";
  baseRemotePath?: string;
  /** Server base URL with `/api/creative-demos` (same default as the Demo button). */
  serverApiUrl?: string;
  /**
   * Window opened synchronously on click (e.g. `about:blank`), then navigate after SFTP resolves —
   * avoids popup blocking `window.open` after `await`.
   */
  targetWindow?: Window | null;
};

function buildRemoteRelativePath(fullPath: string, baseRemotePath: string) {
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

async function getFormatFromData(size: string | null) {
  if (!size) return { format: "inpage-mb", device: "mb" as const };

  const demos = await loadActiveCreativeDemos();

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
  const deviceByCategory = inferDeviceByCategory(foundBySize?.category);
  const device = format.includes("-pc") ? "pc" : deviceByCategory;
  return { format, device: device as "mb" | "pc" };
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

  const relative = buildRemoteRelativePath(
    params.remotePath.trim(),
    baseRemotePath,
  );
  const computedBannerPath = params.bannerPath?.trim()
    ? params.bannerPath.trim().replace(/^\/+/, "")
    : relative
      ? /\.html?$/i.test(relative)
        ? relative.replace(/\/+$/, "")
        : `${relative.replace(/\/+$/, "")}/index.html`
      : "index.html";

  const sizeFromSftp = await getSizeFromSftpDirectory(
    params.remotePath,
    baseRemotePath,
    serverApiUrl,
  );
  const size = sizeFromSftp ?? extractSizeFromPath(computedBannerPath);
  const resolved = params.formatValue?.trim()
    ? {
        format: params.formatValue.trim(),
        device: params.formatValue.includes("-pc")
          ? ("pc" as const)
          : ("mb" as const),
      }
    : await getFormatFromData(size);
  const { format: formatParam, device } = resolved;
  const effectiveDevice = params.forceDevice ?? device;
  const isPcFormat = effectiveDevice === "pc";
  /** PC: …/idpc/index.html — Mobile: …/idmb/index.html. */
  const previewBase = isPcFormat
    ? "https://demo.yomedia.vn/yomedia/app/template/site/idpc/index.html"
    : "https://demo.yomedia.vn/yomedia/app/template/site/idmb/index.html";
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
  /** Relative folder on CDN/SFTP; used to derive `b=.../index.html` and infer size (e.g. 384x683). */
  remotePath: string;
  /** Pass through `b=` query if you already have it */
  bannerPath?: string;
  /** Pass through `f=` query if you already have it */
  formatValue?: string;
  /** Force preview site: `pc` -> idpc, `mb` -> idmb */
  forceDevice?: "pc" | "mb";
  baseRemotePath?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
};

const OpenDemoButton: React.FC<OpenDemoButtonProps> = ({
  remotePath,
  bannerPath,
  formatValue,
  forceDevice,
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
      bannerPath,
      formatValue,
      forceDevice,
      baseRemotePath,
      serverApiUrl,
    });
  }, [
    disabled,
    bannerPath,
    forceDevice,
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
