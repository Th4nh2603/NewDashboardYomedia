import React from "react";

export type OpenYomediaDemoPreviewParams = {
  /** Đường dẫn tương đối (vd `2026/03/.../480x270`) hoặc full có prefix `/script/demo`. */
  remotePath: string;
  bannerPath?: string;
  formatValue?: string;
  forceDevice?: "pc" | "mb";
  baseRemotePath?: string;
  /** Base URL server có `/api/creative-demos` (mặc định giống nút Demo). */
  serverApiUrl?: string;
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
    if (noTrailingSlash.startsWith(`${normalizedBase}/`)) return noTrailingSlash;
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
    const res = await fetch(
      `${serverApiUrl}/api/sftp/list?path=${encodeURIComponent(directoryPath)}`,
    );
    const data = await res.json();
    if (!res.ok || !data?.ok || !Array.isArray(data?.entries)) return null;

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

function inferDeviceByCategory(category: string | null | undefined): "pc" | "mb" {
  const key = String(category ?? "").trim().toLowerCase();
  if (key === "display") return "pc";
  if (key === "mobile") return "mb";
  return "mb";
}

async function getFormatFromApi(size: string | null, serverApiUrl: string) {
  if (!size) return { format: "inpage-mb", device: "mb" as const };

  const res = await fetch(`${serverApiUrl}/api/creative-demos`);
  const data = await res.json();
  if (!res.ok || !data?.ok || !Array.isArray(data?.demos)) {
    return { format: "inpage-mb", device: "mb" as const };
  }

  const demos = data.demos as Array<{
    size?: unknown;
    value?: string;
    category?: string;
  }>;

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

/** Mở tab preview demo.yomedia.vn với `b=` trỏ tới thư mục / file banner (giống nút Demo). */
export async function openYomediaDemoPreview(
  params: OpenYomediaDemoPreviewParams,
) {
  const baseRemotePath = params.baseRemotePath ?? "/script/demo";
  const serverApiUrl =
    params.serverApiUrl ??
    import.meta.env.VITE_SERVER_URL ??
    "http://localhost:3000";

  const hasPath = Boolean(
    (params.bannerPath ?? params.remotePath ?? "").trim(),
  );
  if (!hasPath) return;

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
    : await getFormatFromApi(size, serverApiUrl);
  const { format: formatParam, device } = resolved;
  const effectiveDevice = params.forceDevice ?? device;
  const isPcFormat = effectiveDevice === "pc";
  const previewBase = `https://demo.yomedia.vn/yomedia/app/template/site/id${
    isPcFormat ? "pc" : "mb"
  }/index.html`;
  const url = `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(computedBannerPath)}&l=lt&c=demo`;

  window.open(url, "_blank", "noopener,noreferrer");
}

type OpenDemoButtonProps = {
  /** Relative path (folder) trên CDN/SFTP; dùng để suy ra `b=.../index.html` và đoán size (vd 384x683). */
  remotePath: string;
  /** Truyền trực tiếp query param b=... nếu đã có sẵn */
  bannerPath?: string;
  /** Truyền trực tiếp query param f=... nếu đã có sẵn */
  formatValue?: string;
  /** Ép site preview: `pc` -> idpc, `mb` -> idmb */
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
  const serverApiUrl =
    import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

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
    <button
      type="button"
      onClick={handleOpenDemo}
      disabled={disabled || !(bannerPath ?? remotePath).trim()}
      className={className}
    >
      {label}
    </button>
  );
};

export default OpenDemoButton;
