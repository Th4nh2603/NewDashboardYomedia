import React from "react";

type OpenDemoButtonProps = {
  remotePath: string;
  baseRemotePath?: string;
  className?: string;
  label?: string;
};

const OpenDemoButton: React.FC<OpenDemoButtonProps> = ({
  remotePath,
  baseRemotePath = "/script/demo",
  className = "px-4 py-2.5 rounded-2xl bg-[#4cceac] text-[#020617] text-xs font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed",
  label = "demo",
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

    const found = (data.demos as Array<{ size?: unknown; value?: string }>).find(
      (item) => sizeMatches(item.size, size) && Boolean(item.value),
    );

    const format = found?.value || fallbackFormatBySize(size);
    const device = format.includes("-pc") ? "pc" : "mb";
    return { format, device: device as "mb" | "pc" };
  }, []);

  const handleOpenDemo = React.useCallback(async () => {
    const relative = buildRemoteRelativePath(remotePath);
    const bannerPath = relative
      ? `${relative.replace(/\/+$/, "")}/index.html`
      : "index.html";

    const size = extractSizeFromPath(relative);
    const { format: formatParam, device } = await getFormatFromApi(size);
    const isPcFormat = device === "pc";
    const previewBase = `https://demo.yomedia.vn/yomedia/site/id${
      isPcFormat ? "pc" : "mb"
    }/index.html`;
    const url = `${previewBase}?f=${formatParam}&b=${bannerPath}&l=lt&c=demo`;

    window.open(url, "_blank", "noopener,noreferrer");
  }, [buildRemoteRelativePath, extractSizeFromPath, getFormatFromApi, remotePath]);

  return (
    <button type="button" onClick={handleOpenDemo} className={className}>
      {label}
    </button>
  );
};

export default OpenDemoButton;
