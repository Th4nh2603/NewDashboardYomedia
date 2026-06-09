import { listActiveCreativeDemos } from "../../repositories/creativeDemo.repository.js";
import { listSftpDirectory } from "../infra/sftp.service.js";
import dataJson from "../../data/data.json" with { type: "json" };

const DEMO_REMOTE_PREFIX = "/script/demo";
const PREVIEW_ORIGIN = "https://demo.yomedia.vn";

/** When several active demos share a size, prefer this `value` for preview `f=`. */
const PREFERRED_FORMAT_BY_SIZE: Readonly<Record<string, string>> = {
  "384x683": "mobile-interstitial-firstview",
};

export const DEFAULT_VIDEO_PREVIEW_SPECS = [
  { formatValue: "outstream", title: "Video In-read" },
  { formatValue: "instream", title: "Video Pre-roll" },
] as const;

export type BuildDemoPreviewUrlInput = {
  /** Relative under `/script/demo` (e.g. `2026/06/yomedia/all/html/384x683`). */
  relativePath: string;
  demoFormat: "HTML" | "Video";
  /** creative-demos.json `value` for `f=` (optional; inferred from folder size when omitted). */
  formatValue?: string;
  previewHostTemplate?: "default" | "eva" | "tuoitre";
  /** Video / VAST: use idvd + make-vast.xml */
  instreamVideo?: boolean;
};

/** Extract folder and optional filename from a relative path. */
export function splitRelativeDemoPath(relativePath: string): {
  dirRel: string;
  fileName: string | null;
} {
  const norm = relativePath.replace(/^\/+|\/+$/g, "");
  if (!norm) return { dirRel: "", fileName: null };
  const segs = norm.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  if (/\.[a-z0-9]{1,12}$/i.test(last)) {
    return { dirRel: segs.slice(0, -1).join("/"), fileName: last };
  }
  return { dirRel: norm, fileName: null };
}

function extractSizeFromPath(relativePath: string): string | null {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.find((s) => /^\d{2,4}x\d{2,4}$/i.test(s)) ?? null;
}

function extractSizeFromJsFilename(fileName: string): string | null {
  const match = fileName.trim().toLowerCase().match(/^(\d{2,4}x\d{2,4})\.js$/i);
  return match?.[1] ?? null;
}

function sizeMatches(itemSize: unknown, targetSize: string): boolean {
  if (!itemSize) return false;
  const key = targetSize.toLowerCase();
  if (Array.isArray(itemSize)) {
    return itemSize.some((s) => String(s).toLowerCase() === key);
  }
  return String(itemSize).toLowerCase() === key;
}

function fallbackFormatBySize(size: string, demos: any[]): string {
  const key = size.toLowerCase();
  const match = demos.find((item) => {
    if (!item?.value) return false;
    return sizeMatches(item.size, key);
  });
  return match?.value?.trim() || "inpage-mb";
}

function inferDeviceByCategory(category: string | null | undefined): "pc" | "mb" {
  const key = String(category ?? "").trim().toLowerCase();
  if (key === "display") return "pc";
  return "mb";
}

function inferPreviewSiteByCategory(category: string | null | undefined) {
  const key = String(category ?? "").trim().toLowerCase();
  if (key === "video") return "idvd" as const;
  if (key === "display") return "idpc" as const;
  return "idmb" as const;
}

function resolveFormatFromCatalogValue(formatValue: string, demos: any[]) {
  const format = formatValue.trim();
  const row = demos.find((item) => String(item.value ?? "").trim() === format);
  const category = row?.category ? String(row.category) : null;
  const deviceByCategory = inferDeviceByCategory(category);
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

function resolveFormatFromSize(size: string | null, demos: any[]) {
  if (!size) {
    return {
      format: "inpage-mb",
      device: "mb" as const,
      category: null as string | null,
      previewSite: "idmb" as const,
      entryFile: "index.html",
    };
  }

  const sizeKey = size.toLowerCase();
  const preferredValue = PREFERRED_FORMAT_BY_SIZE[sizeKey];
  const foundBySize =
    (preferredValue
      ? demos.find(
          (item) =>
            String(item?.value ?? "").trim() === preferredValue &&
            sizeMatches(item.size, sizeKey),
        )
      : undefined) ??
    demos.find((item) => {
      if (!item?.value) return false;
      return sizeMatches(item.size, sizeKey);
    });

  const format = foundBySize?.value?.trim() || fallbackFormatBySize(size, demos);
  const category = foundBySize?.category ? String(foundBySize.category) : null;
  const deviceByCategory = inferDeviceByCategory(category);
  const device = format.includes("-pc") ? "pc" : deviceByCategory;
  const previewSite = inferPreviewSiteByCategory(category);
  const entryFile = (foundBySize?.file ?? "").trim() || "index.html";
  return {
    format,
    device: device as "mb" | "pc",
    category,
    previewSite,
    entryFile,
  };
}

const sftpSizeCache = new Map<string, string | null>();

async function getSizeFromSftpDirectory(directoryPath: string): Promise<string | null> {
  if (sftpSizeCache.has(directoryPath)) {
    return sftpSizeCache.get(directoryPath) ?? null;
  }
  try {
    const entries = await listSftpDirectory(directoryPath);
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry?.type === "d") continue;
        const size = extractSizeFromJsFilename(String(entry?.name ?? ""));
        if (size) {
          sftpSizeCache.set(directoryPath, size);
          return size;
        }
      }
    }
  } catch {}
  sftpSizeCache.set(directoryPath, null);
  return null;
}

export async function generatePreviewUrl(
  input: BuildDemoPreviewUrlInput,
): Promise<string | null> {
  const relative = input.relativePath.trim().replace(/^\/+/, "");
  if (!relative) return null;

  const demos = listActiveCreativeDemos() as any[];
  const { dirRel, fileName } = splitRelativeDemoPath(relative);
  const relativeForFolder = fileName !== null ? dirRel : relative;

  const sftpDir = `${DEMO_REMOTE_PREFIX}/${relativeForFolder}`.replace(/[\\/]+/g, "/");
  const sizeFromSftp = await getSizeFromSftpDirectory(sftpDir);

  const provisionalPath = (() => {
    if (!relative) return "";
    if (/\.html?$/i.test(relative)) {
      return relative.replace(/[\\/]+$/g, "");
    }
    if (fileName !== null) {
      const d = dirRel.replace(/[\\/]+$/g, "");
      return d ? `${d}/index.html` : "index.html";
    }
    const folder = relative.replace(/[\\/]+$/g, "");
    return `${folder}/index.html`;
  })();

  const size =
    sizeFromSftp ??
    extractSizeFromPath(relativeForFolder) ??
    extractSizeFromPath(provisionalPath);

  const resolved = input.formatValue?.trim()
    ? resolveFormatFromCatalogValue(input.formatValue.trim(), demos)
    : resolveFormatFromSize(size, demos);

  const { format: formatParam, device, category, previewSite, entryFile } = resolved;

  const computedBannerPath = relative
    ? fileName !== null
      ? relative.replace(/[\\/]+$/g, "")
      : /\.html?$/i.test(relative)
        ? relative.replace(/[\\/]+$/g, "")
        : `${relative.replace(/[\\/]+$/g, "")}/${entryFile}`
    : entryFile;

  const tmpl = input.previewHostTemplate ?? "default";
  const shouldUseVideoSite =
    input.instreamVideo ||
    input.demoFormat === "Video" ||
    previewSite === "idvd" ||
    category === "Video";

  if (shouldUseVideoSite) {
    const vastRel =
      fileName !== null && /\.(xml|vast)$/i.test(fileName)
        ? relative.replace(/\/+$/g, "")
        : `${relative.replace(/\/+$/g, "")}/make-vast.xml`;
    const videoSite = tmpl === "tuoitre" ? "ttvd" : "idvd";
    const previewBase = `${PREVIEW_ORIGIN}/yomedia/app/template/site/${videoSite}/index.html`;
    return `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(vastRel)}&l=${encodeURIComponent("null")}&c=demo`;
  }

  const isPcFormat = device === "pc";
  const deviceKey = isPcFormat ? "pc" : "mb";
  const templateConfig =
    dataJson.site.find((s: any) => s.name === tmpl) ||
    dataJson.site.find((s: any) => s.name === "default");
  const siteSegment = templateConfig ? templateConfig[deviceKey] : isPcFormat ? "idpc" : "idmb";
  const previewBase = `${PREVIEW_ORIGIN}/yomedia/app/template/site/${siteSegment}/index.html`;
  const qr = siteSegment === "idmb" || siteSegment === "ttmb" ? "&qr=true" : "";
  return `${previewBase}?f=${encodeURIComponent(formatParam)}&b=${encodeURIComponent(computedBannerPath)}&l=lt&c=demo${qr}`;
}

export type VideoPreviewLink = {
  label: string;
  formatValue: string;
  previewUrl: string | null;
};

type CreativeDemoRow = {
  size?: string | string[];
  value?: string;
  category?: string;
  file?: string;
  fileType?: string;
  status?: string;
  title?: string;
};

function isCreativeVideoDemo(item: CreativeDemoRow): boolean {
  return String(item.fileType ?? "").trim().toUpperCase() === "VIDEO";
}

/** Video Build Demo / chat: In-read (outstream) + Pre-roll (instream) preview links. */
export async function buildDefaultVideoPreviewLinks(
  relativePath: string,
  options?: Pick<BuildDemoPreviewUrlInput, "previewHostTemplate">,
): Promise<VideoPreviewLink[]> {
  const demos = listActiveCreativeDemos() as CreativeDemoRow[];
  const out: VideoPreviewLink[] = [];

  for (const spec of DEFAULT_VIDEO_PREVIEW_SPECS) {
    const row =
      demos.find(
        (item) =>
          isCreativeVideoDemo(item) &&
          String(item.value ?? "").trim() === spec.formatValue,
      ) ?? null;
    const title = String(row?.title ?? spec.title).trim() || spec.title;
    const label = `${title} · ${spec.formatValue}`;
    const instreamVideo =
      String(row?.category ?? "").trim().toLowerCase() === "video";
    const previewUrl = await buildYomediaDemoPreviewUrl({
      relativePath,
      demoFormat: "Video",
      formatValue: spec.formatValue,
      instreamVideo,
      previewHostTemplate: options?.previewHostTemplate,
    });
    out.push({
      label,
      formatValue: spec.formatValue,
      previewUrl,
    });
  }

  return out;
}

/** Same preview URL as Open demo preview (`demo.yomedia.vn`). */
export async function buildYomediaDemoPreviewUrl(
  input: BuildDemoPreviewUrlInput,
): Promise<string | null> {
  return generatePreviewUrl(input);
}
