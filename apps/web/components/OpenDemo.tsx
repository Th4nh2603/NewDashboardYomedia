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

function sizeMatches(itemSize: unknown, targetSize: string) {
  if (!itemSize) return false;
  if (Array.isArray(itemSize)) {
    return itemSize.some((s) => String(s).toLowerCase() === targetSize.toLowerCase());
  }
  const value = String(itemSize).toLowerCase();
  return (
    value === targetSize.toLowerCase() ||
    value.includes(targetSize.toLowerCase())
  );
}

function fallbackFormatBySize(size: string) {
  const key = size.toLowerCase();
  if (key === "970x250") return "masthead-pc";
  if (key === "480x270") return "masthead-mb";
  if (key === "384x683") return "inpage-mb";
  return "inpage-mb";
}

async function getFormatFromApi(
  size: string | null,
  serverApiUrl: string,
) {
  if (!size) return { format: "inpage-mb", device: "mb" as const };

  const res = await fetch(`${serverApiUrl}/api/creative-demos`);
  const data = await res.json();
  if (!res.ok || !data?.ok || !Array.isArray(data?.demos)) {
    return { format: "inpage-mb", device: "mb" as const };
  }

  const found = (
    data.demos as Array<{
      size?: unknown;
      value?: string;
    }>
  ).find((item) => {
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

  const format = found?.value || fallbackFormatBySize(size);
  const device = format.includes("-pc") ? "pc" : "mb";
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

  const size = extractSizeFromPath(computedBannerPath);
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
  const previewBase = `https://demo.yomedia.vn/yomedia/site/id${
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
