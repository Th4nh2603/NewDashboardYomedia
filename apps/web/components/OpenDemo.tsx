import React from "react";

type OpenDemoButtonProps = {
  /** Relative path (folder) trên CDN/SFTP; dùng để suy ra `b=.../index.html` và đoán size (vd 384x683). */
  remotePath: string;
  /** Truyền trực tiếp query param b=... nếu đã có sẵn */
  bannerPath?: string;
  /** Truyền trực tiếp query param f=... nếu đã có sẵn */
  formatValue?: string;
  baseRemotePath?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
};

const OpenDemoButton: React.FC<OpenDemoButtonProps> = ({
  remotePath,
  bannerPath,
  formatValue,
  baseRemotePath = "/script/demo",
  className = "px-4 py-2.5 rounded-2xl bg-[#4cceac] text-[#020617] text-xs font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed",
  label = "demo",
  disabled = false,
}) => {
  const buildRemoteRelativePath = React.useCallback(
    (fullPath: string) => {
      if (fullPath.startsWith(baseRemotePath)) {
        return fullPath.slice(baseRemotePath.length).replace(/^\/+/, "");
      }
      return fullPath.replace(/^\/+/, "");
    },
    [baseRemotePath],
  );

  const extractSizeFromPath = React.useCallback((relativePath: string) => {
    const segments = relativePath.split("/").filter(Boolean);
    return segments.find((s) => /^\d{2,4}x\d{2,4}$/i.test(s)) ?? null;
  }, []);

  const sizeMatches = (itemSize: unknown, targetSize: string) => {
    if (!itemSize) return false;
    if (Array.isArray(itemSize)) {
      return itemSize.some((s) => String(s).toLowerCase() === targetSize.toLowerCase());
    }
    const value = String(itemSize).toLowerCase();
    return (
      value === targetSize.toLowerCase() ||
      value.includes(targetSize.toLowerCase())
    );
  };

  const fallbackFormatBySize = (size: string) => {
    const key = size.toLowerCase();
    if (key === "970x250") return "masthead-pc";
    if (key === "480x270") return "masthead-mb";
    if (key === "384x683") return "inpage-mb";
    return "inpage-mb";
  };

  const getFormatFromApi = React.useCallback(async (size: string | null) => {
    if (!size) return { format: "inpage-mb", device: "mb" as const };

    const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/creative-demos`);
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
      return (
        sizes.some((s) => sizeMatches(s, size)) && Boolean(item.value)
      );
    });

    const format = found?.value || fallbackFormatBySize(size);
    const device = format.includes("-pc") ? "pc" : "mb";
    return { format, device: device as "mb" | "pc" };
  }, []);

  const handleOpenDemo = React.useCallback(async () => {
    const hasPath = Boolean((bannerPath ?? remotePath).trim());
    if (disabled || !hasPath) return;

    const relative = buildRemoteRelativePath(remotePath.trim());
    const computedBannerPath = bannerPath?.trim()
      ? bannerPath.trim().replace(/^\/+/, "")
      : relative
      ? /\.html?$/i.test(relative)
        ? relative.replace(/\/+$/, "")
        : `${relative.replace(/\/+$/, "")}/index.html`
      : "index.html";

    const size = extractSizeFromPath(computedBannerPath);
    const resolved = formatValue?.trim()
      ? {
          format: formatValue.trim(),
          device: formatValue.includes("-pc") ? ("pc" as const) : ("mb" as const),
        }
      : await getFormatFromApi(size);
    const { format: formatParam, device } = resolved;
    const isPcFormat = device === "pc";
    const previewBase = `https://demo.yomedia.vn/yomedia/site/id${
      isPcFormat ? "pc" : "mb"
    }/index.html`;
    const url = `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(computedBannerPath)}&l=lt&c=demo`;

    window.open(url, "_blank", "noopener,noreferrer");
  }, [
    buildRemoteRelativePath,
    disabled,
    extractSizeFromPath,
    getFormatFromApi,
    bannerPath,
    formatValue,
    remotePath,
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
