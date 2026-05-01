import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CloudArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  BoltIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import demoConfig from "../data/demoConfig.json";
import brandColors from "../data/brandColors.json";
import { openYomediaDemoPreview } from "../components/OpenDemo";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";
import Button from "../components/Button";
import JSZip from "jszip";

/** Default manifest entry: replace file path with inlined PNG (s_on). */
const S_ON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEX///8AAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzACXMChfymT9mWbJMv3+McuXYpbWoq14AAAHlSURBVEjHvZaJjoMwDES9gYSE+5j//9alpsaUhk1opbVUIIWn8Tgn/cSitEbC2jL6CcUgOoWxZRK0FA9zRimJKXoJlheIonHQUDLKM6hyKVEFlcsKewYN3SRJuXsk5XLe7xVS0FI65u61QJRZmAZoXkjKNNgDGI7J0pXg2PujPybrgyTFBX0HVNKo3cPfAhQHSYoKBgf9zLvN3wT0KkkRQb8AO6j+AjDvkiv4xtUzDmC7/oa1td4LYNxHAb1lWgECsr+BGGlYsttzJSv5hUcQERTcjbUsuTYcPeOHNoujA8cJZH3Xcv8PXNiwcXuiCy5A6vih5mvQPrJqLA5Klo6zPJhMgZJlAbDjOR/sWaYCiPF8MPDTf4Ljp+DCfdDxu/kOOAGjDBr5M9WPMnS4Nwu+NgI+NfsYKC8qxgduDDLkRLMpOM5gWO+z57ncslFZPc7T6gyODq7mAjX0wCepTWQiD+5lPjb1im9TpDqM8djS0XYHkGHHheV8xWJ8sQqTgML1JPlymKvl0VfQGeRnDFudnBfB6wW5LRBIyFHyFcE/twApvOa7kAqmNx3lGmnYG9ucn5UztzZWv3NUfruVc5SfHB5uaZbvJyubxyl4gzRXh0CTY+/7Y+f3B11NOI0peH0sN/HT/C/3pivwmDak6QAAAABJRU5ErkJggg==";

/** Default manifest entry: replace file path with inlined PNG (s_off). */
const S_OFF_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEX///8AAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzAJkmGWYOsj8H8thZf+W/jHJMzPy/nOYAAAFuSURBVEjHrdZZkoMwDATQJhIGk7CO7n/WgTKgYrxhMv2TBR4CF7aFKhTDTHuYTfAUH1om/AmxzUJGOGQ8mGNKo9AgHbJhyMjGBqDFnbBCdSVSIaFQQl2ZRHhc8iOEYgc6oUVZ+ICEwhgHDUJppzp5s4gUrAeRJVUSwYLtS9a8UiURKjgPkoawK/TLjSI5yBWM93SdXGEPveZ83iv4BFsW4CUKXf3mdG85rlKB3F8/+7ke3A40pxOp93E9ykkMfrpDfga9BjgNVernLajHmqsD3YDo3U91eahSXQF0QytdWwwb9/vdFkB1TpbASUdVJedhv4/LVfJecwlD5/TNUWmOmmMMNtd3tfu479608iCay+yYz2lVPZqPvEIOLzj5pcPAyzJmIEWXx3obwSkKTWJBnrp3vGByC6jbeMGnm86X21yxtA+3cvN186CyoJ7Cm89pn7VkFGkCLaUdP2w77f82uhpDPsu01mpZMSjczf8CCMYlsaG5I9IAAAAASUVORK5CYII=";

const BTN_REPLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAAM1BMVEUAAAD///////////////////////////////////////////////////////////////+3leKCAAAAEHRSTlMAf+8/Dx8vv49vX9+fT6/P7uaPeAAAANZJREFUOMvtkd0SxBAMRiOon6rm/Z92TadEo2bc7MXO7LkThy8BfhebXDRr6oGU1lS7Ex5L5oZEatmMMkdfBHXR+qTBNCcxZys7IrRDTMNxtayyCA8sdhPsZbk9s5HFwOV8LxlFjO7KrRPOYIw4/5iFOoDxUjyIcTJo1mLmsqWpGBOprjwXNaQo3sy9Prcq289RyPeiriJuQ4yGHqzmXk3r7wJMfga9NiVf1aMHyL8e4VFklyNoQBJevQ1G/OglC29EFNcpmGB8r3XXjdjg8LJytPDnC3wA/ZYX0JaBReoAAAAASUVORK5CYII=";

const BTN_PLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABOCAMAAABMilufAAAAVFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////8wXzyWAAAAG3RSTlMADPUc33ftqifPtpVRQuZrODHVx7+djIRiWRRgp4d+AAABBklEQVRYw6TQyRWCQAAEUQYERxBZ3O3887QvvA6gKoB/qGasDU6aCjc0LNhw+4wNh7bo6FWogbZI6TJjw50rMbKFG7p9iJEtwMiWjhtq3wUY2QKMbFmJkS3EyBZquNMXG+6+EiNbuKG2L8DIFmBky4YN9+yIkS3Y8JYrNtxjI0a2ACNbiJEtxMgWbLjpxw0NPTeULSKNFRrZItiw2MDt/2bM5AagEASiEcMSDvjN96D9N2oRHmYa4EBglkcxw5Rgpxn4GzMl+Lk18RokSqDJa+I9SrThPfv/8BlGtOEz3Xu2rEOQtb3ju0dtgi7mHd9NaxN0dQ88u7BBwHIy8GzLBgHry3fmeAH5pBXvjExH/QAAAABJRU5ErkJggg==";

const BG_VIDEOS_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAAEOAQMAAABrVFYkAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAACZJREFUeNrtwQENAAAAwiD7p7bHBwwAAAAAAAAAAAAAAAAAAACIOkBWAAFeWY6hAAAAAElFTkSuQmCC";

/**
 * Ảnh đã có bản data URL cố định (s_on, s_off, nút, nền video) — không ghi đè bằng base64 từ file upload.
 */
const BUNDLED_DEMO_ASSET_IMAGE_BASENAMES = new Set(
  [
    "s_on copy.png",
    "s_off copy.png",
    "preplaytvc0001.png",
    "playbtn0001.png",
    "htt.png",
  ].map((s) => s.toLowerCase()),
);

function isBundledDemoAssetImageName(name: string): boolean {
  const leaf = (name.split(/[/\\]/).pop() ?? name).trim().toLowerCase();
  return BUNDLED_DEMO_ASSET_IMAGE_BASENAMES.has(leaf);
}

/** Thay manifest ảnh chuẩn bằng data URL cố định (nháy đơn / nháy kép, %20 hoặc space). */
function replaceBundledDemoStaticImages(content: string): string {
  let c = content;
  const sq = [
    [
      `'id': 's_on', 'src':'images/s_on%20copy.png'`,
      `'id': 's_on',\n            'src': '${S_ON_DATA_URL}'`,
    ],
    [
      `'id': 's_on', 'src':'images/s_on copy.png'`,
      `'id': 's_on',\n            'src': '${S_ON_DATA_URL}'`,
    ],
    [
      `'id': 's_off', 'src':'images/s_off%20copy.png'`,
      `'id': 's_off',\n            'src': '${S_OFF_DATA_URL}'`,
    ],
    [
      `'id': 's_off', 'src':'images/s_off copy.png'`,
      `'id': 's_off',\n            'src': '${S_OFF_DATA_URL}'`,
    ],
    [
      `'id': 'btn_replay', 'src':'images/preplaytvc0001.png'`,
      `'id': 'btn_replay',\n            'src': '${BTN_REPLAY_DATA_URL}'`,
    ],
    [
      `'id': 'btn_play', 'src':'images/playBtn0001.png'`,
      `'id': 'btn_play',\n            'src': '${BTN_PLAY_DATA_URL}'`,
    ],
    [
      `'id': 'bg_videos', 'src':'images/htt.png'`,
      `'id': 'bg_videos',\n            'src': '${BG_VIDEOS_DATA_URL}'`,
    ],
  ] as const;
  for (const [from, to] of sq) c = c.replaceAll(from, to);

  const dqOn = `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`;
  const dqOff = `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`;
  const dqReplay = `"id": "btn_replay",\n            "src": "${BTN_REPLAY_DATA_URL}"`;
  const dqPlay = `"id": "btn_play",\n            "src": "${BTN_PLAY_DATA_URL}"`;
  const dqBg = `"id": "bg_videos",\n            "src": "${BG_VIDEOS_DATA_URL}"`;
  for (const [from, to] of [
    [`"id": "s_on", "src": "images/s_on%20copy.png"`, dqOn],
    [`"id": "s_on", "src":"images/s_on%20copy.png"`, dqOn],
    [`"id": "s_on", "src": "images/s_on copy.png"`, dqOn],
    [`"id": "s_on", "src":"images/s_on copy.png"`, dqOn],
    [`"id": "s_off", "src": "images/s_off%20copy.png"`, dqOff],
    [`"id": "s_off", "src":"images/s_off%20copy.png"`, dqOff],
    [`"id": "s_off", "src": "images/s_off copy.png"`, dqOff],
    [`"id": "s_off", "src":"images/s_off copy.png"`, dqOff],
    [`"id": "btn_replay", "src": "images/preplaytvc0001.png"`, dqReplay],
    [`"id": "btn_replay", "src":"images/preplaytvc0001.png"`, dqReplay],
    [`"id": "btn_play", "src": "images/playBtn0001.png"`, dqPlay],
    [`"id": "btn_play", "src":"images/playBtn0001.png"`, dqPlay],
    [`"id": "bg_videos", "src": "images/htt.png"`, dqBg],
    [`"id": "bg_videos", "src":"images/htt.png"`, dqBg],
  ] as const) {
    c = c.replaceAll(from, to);
  }
  // Fallback cho object literal nhiều dòng (id và src không cùng 1 dòng).
  c = c.replace(
    /(id\s*:\s*["']s_on["'][\s\S]*?src\s*:\s*["'])images\/s_on(?:%20| )copy\.png(["'])/g,
    `$1${S_ON_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']s_off["'][\s\S]*?src\s*:\s*["'])images\/s_off(?:%20| )copy\.png(["'])/g,
    `$1${S_OFF_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_replay["'][\s\S]*?src\s*:\s*["'])images\/preplaytvc0001\.png(["'])/g,
    `$1${BTN_REPLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_play["'][\s\S]*?src\s*:\s*["'])images\/playBtn0001\.png(["'])/g,
    `$1${BTN_PLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']bg_videos["'][\s\S]*?src\s*:\s*["'])images\/htt\.png(["'])/g,
    `$1${BG_VIDEOS_DATA_URL}$2`,
  );
  return c;
}

const DEMO_MANIFEST_JQUERY_SRC =
  "https://media.yomedia.vn/createjs/jquery-2022.min.js?1726036079413";
const DEMO_MANIFEST_ANWIDGET_SRC =
  "https://demo.yomedia.vn/yomedia/components/sdk/anwidget.js?1726036079413";
const DEMO_MANIFEST_VIDEO_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/video/src/video.js?1726036079413";
const DEMO_MANIFEST_UI_IMAGE_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/ui/src/image.js?1726036079413";

/** CDN / relative script URLs in createjs manifest → fixed demo.yomedia / media.yomedia URLs. */
function replaceDemoManifestScriptUrls(content: string): string {
  let c = content;
  c = c.replace(
    /src:\s*"https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*'https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/sdk\/anwidget\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/sdk\/anwidget\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/video\/src\/video\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/video\/src\/video\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/ui\/src\/image\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/ui\/src\/image\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  return c;
}

interface ErrorState {
  message: string;
  type: "validation" | "processing" | "system" | "partial";
  action?: () => void;
  actionLabel?: string;
}

/** Tên file + base64 lưu chung một state cho ảnh */
interface ImageBase64Entry {
  name: string;
  base64: string;
}

interface UploadedFile {
  id: string;
  file: File;
  relativePath: string;
  preview: string;
  status: "uploading" | "success" | "error";
  timestamp: number;
  /** Ảnh: lưu kèm tên file và base64 chung state */
  imageBase64?: ImageBase64Entry;
}

interface DemoTitleOption {
  id: string;
  title: string;
  size: string | string[];
}

interface OfflineGeneratedFile {
  name: string;
  blob: Blob;
}

/** Đọc hết batch từ DirectoryReader (Chrome trả tối đa ~100 entry mỗi lần). */
function readAllDirEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const acc: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(acc);
            return;
          }
          acc.push(...batch);
          readBatch();
        },
        (err) => reject(err),
      );
    };
    readBatch();
  });
}

/** Đường dẫn tương đối khi kéo-thả folder — không gán vào File (webkitRelativePath chỉ đọc). */
const dropRelativePathByFile = new WeakMap<File, string>();

/**
 * Thu thập mọi file trong cây thư mục (kéo-thả folder).
 * Lưu relative path trong WeakMap để dedupe đúng khi trùng tên ở subfolder.
 */
function readEntry(
  entry: FileSystemEntry,
  pathPrefix: string,
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file: File) => {
          dropRelativePathByFile.set(file, `${pathPrefix}${file.name}`);
          resolve([file]);
        },
        (err) => reject(err),
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const dirPath = `${pathPrefix}${entry.name}/`;
      void readAllDirEntries(reader)
        .then(async (entries) => {
          const nested = await Promise.all(
            entries.map((e) => readEntry(e, dirPath)),
          );
          resolve(nested.flat());
        })
        .catch(reject);
    } else {
      resolve([]);
    }
  });
}

/**
 * Khi kéo thả folder từ Explorer, dataTransfer.files đôi khi có File giả (0 byte, không đuôi).
 */
function isDroppedFolderPlaceholder(file: File): boolean {
  if (file.size !== 0) return false;
  const base = file.name.split(/[/\\]/).pop() ?? file.name;
  if (base.includes(".")) return false;
  const t = file.type || "";
  if (t !== "" && t !== "application/octet-stream") return false;
  return true;
}

function fileDedupeKey(f: File): string {
  const rel =
    dropRelativePathByFile.get(f)?.trim() ||
    (f as File & { webkitRelativePath?: string }).webkitRelativePath?.trim();
  if (rel) return `${rel}\0${f.size}\0${f.lastModified}`;
  return `${f.name}\0${f.size}\0${f.lastModified}`;
}

function mergeDroppedFiles(list: File[]): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const f of list) {
    const k = fileDedupeKey(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

const BuildDemo: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const brands = (demoConfig as any).ListBrands ?? [];
  const years = (demoConfig as any).ListYears ?? [];
  const months = (demoConfig as any).ListMonth ?? [];
  const productCates = (demoConfig as any).ListProductCate ?? [];
  const productCateIdsByBrand = (demoConfig as any).ProductCateIdsByBrand ?? {};
  const getProductCateOptionsByBrand = (brandId: string) => {
    if (!brandId?.trim()) {
      return productCates.filter(
        (item: any) => String(item?.id ?? "").toLowerCase() === "all",
      );
    }
    const allowedRaw: string[] | undefined =
      productCateIdsByBrand[brandId] ??
      Object.entries(productCateIdsByBrand).find(
        ([k]) => k.toLowerCase() === brandId.toLowerCase(),
      )?.[1];
    if (!allowedRaw?.length) {
      return productCates.filter(
        (item: any) => String(item?.id ?? "").toLowerCase() === "all",
      );
    }
    const allowed = new Set(
      allowedRaw.map((id) => String(id).trim().toLowerCase()),
    );
    allowed.add("all");
    return productCates.filter((item: any) =>
      allowed.has(
        String(item?.id ?? "")
          .trim()
          .toLowerCase(),
      ),
    );
  };
  const seasons = ["Spring", "Summer", "Autumn", "Winter"];

  const now = new Date();
  const currentYearLabel = String(now.getFullYear());
  const currentMonthLabel = String(now.getMonth() + 1).padStart(2, "0");
  const getSeasonByMonth = (monthValue: string) => {
    const month = Number.parseInt(monthValue, 10);
    if (month >= 3 && month <= 5) return "Spring";
    if (month >= 6 && month <= 8) return "Summer";
    if (month >= 9 && month <= 11) return "Autumn";
    return "Winter";
  };

  const currentYearId =
    years.find(
      (y: any) => y.id === currentYearLabel || y.label === currentYearLabel,
    )?.id ??
    years[0]?.id ??
    "standard";

  const currentMonthId =
    months.find(
      (m: any) => m.id === currentMonthLabel || m.label === currentMonthLabel,
    )?.id ??
    months[0]?.id ??
    "standard";
  const currentSeason = getSeasonByMonth(currentMonthLabel);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const ignoreNextDropzoneClick = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTextFile, setSelectedTextFile] = useState<{
    name: string;
    content: string;
    mode: "view" | "edit";
  } | null>(null);
  const [config, setConfig] = useState({
    model: "",
    quality: currentYearId,
    mode: currentMonthId,
    productCate: productCates[0]?.id ?? "",
    season: currentSeason,
  });
  const [sourceUrl, setSourceUrl] = useState("");
  const [directoryExists, setDirectoryExists] = useState(false);
  const [checkingDirectory, setCheckingDirectory] = useState(false);
  const [replacementName, setReplacementName] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [filterType, setFilterType] = useState<"all" | "recent">("all");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendingToSftp, setSendingToSftp] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [offlineGeneratedFiles, setOfflineGeneratedFiles] = useState<
    OfflineGeneratedFile[]
  >([]);
  const [preparingOfflineFiles, setPreparingOfflineFiles] = useState(false);
  const [downloadingOfflineZip, setDownloadingOfflineZip] = useState(false);
  const [demoTitleOptions, setDemoTitleOptions] = useState<DemoTitleOption[]>(
    [],
  );
  const [selectedDemoTitle, setSelectedDemoTitle] = useState("");
  const [metrics, setMetrics] = useState({
    gpu: 12,
    ram: 2.4,
    latency: 18,
    health: "Optimal",
  });
  const productCateOptions = getProductCateOptionsByBrand(config.model);
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const sftpRoleHeaders = normalizedRole
    ? { "x-user-role": normalizedRole }
    : undefined;

  const getItemLabelById = (list: any[], id: string) => {
    const found = list.find((item: any) => item.id === id);
    return String(found?.label ?? found?.id ?? id ?? "").trim();
  };

  const normalizePathToken = (value: string) =>
    value.trim().replace(/\s+/g, "-").replace(/\/+/g, "-");

  const normalizeMatchToken = (value: string) =>
    value
      .trim()
      .replace(/\.[^.]+$/, "")
      .toLowerCase();

  const getUploadedNameToken = () => {
    const firstHtml = files.find((f) =>
      ["text/html", "application/xhtml+xml"].includes(f.file.type),
    );
    const firstJs = files.find((f) =>
      ["application/javascript", "text/javascript"].includes(f.file.type),
    );
    const picked = firstHtml ?? firstJs ?? files[0];
    if (!picked) return "";
    return normalizePathToken(picked.file.name.replace(/\.[^.]+$/, ""));
  };

  const autoUploadNameToken = getUploadedNameToken();
  const effectiveUploadNameToken = replacementName.trim()
    ? normalizePathToken(replacementName.trim())
    : autoUploadNameToken;
  /** Tên segment path cuối phải > 5 ký tự (tối thiểu 6). */
  const uploadNameValid = effectiveUploadNameToken.length > 5;
  const showUploadNameInput =
    directoryExists ||
    (files.length > 0 &&
      (autoUploadNameToken.length === 0 || autoUploadNameToken.length <= 5));

  const fileNameTokens = React.useMemo(() => {
    const out = new Set<string>();
    for (const item of files) {
      const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
      if (ext !== ".html" && ext !== ".htm") continue;
      const token = normalizeMatchToken(String(item.file.name ?? ""));
      if (token) out.add(token);
    }
    return out;
  }, [files]);

  const getBrandColorClass = (name: string) => {
    const lower = name.toLowerCase();
    const match = (
      brandColors as {
        keyword: string;
        className: string;
        match?: "start" | "any";
      }[]
    ).find((item) => {
      const kw = item.keyword.toLowerCase();
      if (!kw) return false;
      if (item.match === "start") {
        return lower.startsWith(kw);
      }
      return lower.includes(kw);
    });
    return match?.className || "text-[#e5e7eb]";
  };

  const buildRemoteSourcePath = () => {
    const year = getItemLabelById(years, config.quality);
    const month = getItemLabelById(months, config.mode).padStart(2, "0");
    const brand = normalizePathToken(
      getItemLabelById(brands, config.model).toLowerCase(),
    );
    const productCate = normalizePathToken(
      getItemLabelById(productCates, config.productCate).toLowerCase(),
    );
    const season = normalizePathToken(config.season.toLowerCase());
    const uploadName = replacementName.trim()
      ? normalizePathToken(replacementName.trim())
      : getUploadedNameToken();

    const segments = [year, month, brand, productCate];
    if (uploadName) segments.push(uploadName);

    return segments.filter(Boolean).join("/");
  };

  useEffect(() => {
    setSourceUrl(buildRemoteSourcePath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, files, replacementName]);

  useEffect(() => {
    const targetPath = sourceUrl.trim();
    if (!targetPath || files.length === 0) {
      setDirectoryExists(false);
      setCheckingDirectory(false);
      return;
    }

    let cancelled = false;
    const checkDirectory = async () => {
      setCheckingDirectory(true);
      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          exists?: boolean;
          kind?: string;
        }>(
          `${baseUrl}/api/sftp/exists?scope=demo&path=${encodeURIComponent(`/script/demo/${targetPath}`)}`,
          { headers: sftpRoleHeaders },
        );
        if (!cancelled) {
          const exists = Boolean(
            data?.ok &&
            data?.exists &&
            (data?.kind === "directory" ||
              data?.kind === "file" ||
              data?.kind === "symlink"),
          );
          setDirectoryExists(exists);
        }
      } catch {
        if (!cancelled) {
          setDirectoryExists(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingDirectory(false);
        }
      }
    };

    void checkDirectory();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, files.length, baseUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadDemoTitles = async () => {
      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          items?: Array<{
            id?: string;
            title?: string;
            size?: string | string[];
          }>;
        }>(`${baseUrl}/api/creative-demo-titles?activeOnly=0`);
        const items = Array.isArray(data.items)
          ? data.items
              .map((item) => ({
                id: String(item?.id ?? "").trim(),
                title: String(item?.title ?? "").trim(),
                size: Array.isArray(item?.size)
                  ? item.size
                  : String(item?.size ?? "").trim(),
              }))
              .filter((item) => item.id && item.title)
          : [];
        if (!cancelled) {
          setDemoTitleOptions(items);
        }
      } catch {
        if (!cancelled) {
          setDemoTitleOptions([]);
        }
      }
    };
    void loadDemoTitles();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  useEffect(() => {
    if (
      selectedDemoTitle &&
      !demoTitleOptions.some((item) => item.title === selectedDemoTitle)
    ) {
      setSelectedDemoTitle("");
    }
  }, [demoTitleOptions, selectedDemoTitle]);

  const filteredDemoTitleOptions = React.useMemo(() => {
    return demoTitleOptions.filter((item) => {
      const sizesRaw = Array.isArray(item.size) ? item.size : [item.size];
      return sizesRaw.some((s) => {
        const token = normalizeMatchToken(String(s ?? ""));
        return token && fileNameTokens.has(token);
      });
    });
  }, [demoTitleOptions, fileNameTokens]);

  useEffect(() => {
    if (
      selectedDemoTitle &&
      !filteredDemoTitleOptions.some((item) => item.title === selectedDemoTitle)
    ) {
      setSelectedDemoTitle("");
    }
  }, [filteredDemoTitleOptions, selectedDemoTitle]);

  useEffect(() => {
    const monthLabel = getItemLabelById(months, config.mode).padStart(2, "0");
    const seasonByMonth = getSeasonByMonth(monthLabel);
    setConfig((prev) =>
      prev.season === seasonByMonth ? prev : { ...prev, season: seasonByMonth },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode]);

  useEffect(() => {
    if (
      productCateOptions.length > 0 &&
      !productCateOptions.some((item: any) => item.id === config.productCate)
    ) {
      setConfig((prev) => ({
        ...prev,
        productCate: productCateOptions[0].id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.model]);

  // Simulate real-time metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        gpu: Math.max(5, Math.min(95, prev.gpu + (Math.random() * 10 - 5))),
        ram: Math.max(1, Math.min(16, prev.ram + (Math.random() * 0.4 - 0.2))),
        latency: Math.max(
          10,
          Math.min(150, prev.latency + (Math.random() * 20 - 10)),
        ),
        health: prev.gpu > 85 ? "Warning" : "Optimal",
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Nén ảnh trên client xuống ~70% chất lượng rồi trả về base64
  const compressImageToDataUrl = (file: File, quality = 0.7): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0);

        // Re-encode mọi định dạng (kể cả PNG) sang WebP với quality ~70%
        const mime = "image/webp";
        try {
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl);
        } catch (err) {
          reject(
            err instanceof Error ? err : new Error("Image compression failed"),
          );
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };

      img.src = objectUrl;
    });

  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
  const VIDEO_EXTS = [".mp4", ".webm", ".mov"];
  const TEXT_EXTS = [".html", ".htm", ".js", ".mjs"];
  const formatBytes = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(
      Math.floor(Math.log(value) / Math.log(1024)),
      units.length - 1,
    );
    const size = value / Math.pow(1024, exponent);
    return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[exponent]}`;
  };

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;
    setError(null);

    const validEntries: { file: File }[] = [];
    const validationErrors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      if (isDroppedFolderPlaceholder(file)) {
        return;
      }
      const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
      const isImageExt = IMAGE_EXTS.includes(ext);
      const isTextExt = TEXT_EXTS.includes(ext);
      const isVideoExt = VIDEO_EXTS.includes(ext);
      const isSupportedMime =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        [
          "text/html",
          "application/xhtml+xml",
          "application/javascript",
          "text/javascript",
          "text/jsx",
        ].includes(file.type);

      const maxSize = isVideoExt ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        validationErrors.push(
          `${file.name} exceeds ${isVideoExt ? "500MB" : "10MB"} limit.`,
        );
        return;
      }
      if (!isImageExt && !isTextExt && !isVideoExt && !isSupportedMime) {
        validationErrors.push(
          `${file.name} is not a supported format (image/video/html/js only).`,
        );
        return;
      }
      validEntries.push({ file });
    });

    const fileArray: UploadedFile[] = [];
    const processingErrors: string[] = [];

    for (const { file } of validEntries) {
      try {
        const id = Math.random().toString(36).substring(7);
        const timestamp = Date.now();
        const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
        const isImage =
          file.type.startsWith("image/") || IMAGE_EXTS.includes(ext);
        let imageBase64: ImageBase64Entry | undefined;
        if (isImage) {
          try {
            const base64 = await compressImageToDataUrl(file, 0.7);
            imageBase64 = { name: file.name, base64 };
          } catch {
            const raw = await new Promise<string>((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(String(r.result ?? ""));
              r.onerror = () => rej(new Error("read failed"));
              r.readAsDataURL(file);
            });
            imageBase64 = { name: file.name, base64: raw };
          }
        }
        fileArray.push({
          id,
          file,
          relativePath:
            dropRelativePathByFile.get(file) ||
            (file as File & { webkitRelativePath?: string })
              .webkitRelativePath ||
            file.name,
          preview: isImage ? URL.createObjectURL(file) : "",
          status: "success" as const,
          timestamp,
          imageBase64,
        });
      } catch (err) {
        processingErrors.push(
          `${file.name}: ${
            err instanceof Error ? err.message : "processing failed"
          }`,
        );
      }
    }

    const allSkipped = [...validationErrors, ...processingErrors];
    const guidelinesAction = () =>
      alert(
        "Supported formats:\n- Images: PNG, JPG, JPEG, WEBP, GIF, SVG (<= 10MB)\n- Videos: MP4, WEBM, MOV (<= 500MB)\n- HTML: .html, .htm\n- JS: .js, .mjs",
      );

    if (allSkipped.length > 0) {
      if (fileArray.length > 0) {
        setError({
          type: "partial",
          message: `Added ${fileArray.length} file(s). Skipped ${allSkipped.length}:\n${allSkipped.join("\n")}`,
          actionLabel: "View Guidelines",
          action: guidelinesAction,
        });
      } else {
        setError({
          message: `Failed to ingest ${allSkipped.length} assets:\n${allSkipped.join(
            "\n",
          )}`,
          type: "validation",
          actionLabel: "View Guidelines",
          action: guidelinesAction,
        });
      }
    }

    setFiles((prev) => [...prev, ...fileArray]);
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    ignoreNextDropzoneClick.current = true;
    window.setTimeout(() => {
      ignoreNextDropzoneClick.current = false;
    }, 400);

    // Phải đọc items/files ĐỒNG BỘ trước mọi await: sau await, DataTransfer có thể không còn hợp lệ
    // → chỉ xử lý được mục đầu (folder + html + js cùng lúc sẽ thiếu file).
    const fileListFallback = Array.from(e.dataTransfer.files ?? []).filter(
      (f) => !isDroppedFolderPlaceholder(f),
    );

    type DropSnapshot =
      | { kind: "entry"; entry: FileSystemEntry }
      | { kind: "file"; file: File };

    const snapshots: DropSnapshot[] = [];
    const items = e.dataTransfer.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = (
          item as DataTransferItem & {
            webkitGetAsEntry?: () => FileSystemEntry | null;
          }
        ).webkitGetAsEntry?.();
        if (entry) {
          snapshots.push({ kind: "entry", entry });
        } else if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && !isDroppedFolderPlaceholder(f)) {
            snapshots.push({ kind: "file", file: f });
          }
        }
      }
    }

    const allFiles: File[] = [];

    for (const snap of snapshots) {
      if (snap.kind === "entry") {
        try {
          const files = await readEntry(snap.entry, "");
          allFiles.push(...files);
        } catch {
          /* ignore */
        }
      } else {
        allFiles.push(snap.file);
      }
    }

    // Gộp thêm FileList (một số bản Windows/Chrome đưa html/js vào đây song song với items).
    const merged = mergeDroppedFiles([...allFiles, ...fileListFallback]);
    if (merged.length === 0) return;

    const dt = new DataTransfer();
    merged.forEach((file) => dt.items.add(file));
    void handleFiles(dt.files);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      // Revoke the object URL to avoid memory leaks
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const replaceImagesToBase64 = (content: string) => {
    content = replaceDemoManifestScriptUrls(content);
    content = replaceBundledDemoStaticImages(content);

    const images = files
      .filter((f) => f.imageBase64)
      .map((f) => f.imageBase64!)
      .filter(Boolean);
    if (images.length === 0) return content;

    // Replace each manifest entry line that contains the original image name,
    // so we can also inject `type:createjs.AbstractLoader.IMAGE`.
    const lines = content.split(/\r?\n/);

    for (const img of images) {
      if (isBundledDemoAssetImageName(img.name)) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes(img.name)) continue;

        const idx = line.indexOf(img.name);
        if (idx === -1) continue;

        const afterNameIndex = idx + img.name.length;

        // Find the next closing quote after the image name.
        const nextDoubleQuoteIndex = line.indexOf('"', afterNameIndex);
        const nextSingleQuoteIndex = line.indexOf("'", afterNameIndex);

        const nextQuoteIndex =
          nextDoubleQuoteIndex === -1
            ? nextSingleQuoteIndex
            : nextSingleQuoteIndex === -1
              ? nextDoubleQuoteIndex
              : Math.min(nextDoubleQuoteIndex, nextSingleQuoteIndex);

        // Default to double quotes if we cannot detect the quote style.
        const quoteChar =
          nextQuoteIndex === -1
            ? '"'
            : nextQuoteIndex === nextSingleQuoteIndex
              ? "'"
              : '"';

        const suffixAfterQuote =
          nextQuoteIndex === -1
            ? line.slice(afterNameIndex)
            : line.slice(nextQuoteIndex + 1);

        const leadingWs = line.match(/^\s*/)?.[0] ?? "";
        lines[i] =
          `${leadingWs}{type:createjs.AbstractLoader.IMAGE, src:${quoteChar}${img.base64}${quoteChar}${suffixAfterQuote}`;
        // Chèn xong 1 manifest entry cho ảnh này thì dừng quét phần còn lại trong file
        // (tránh chèn trùng nếu img.name xuất hiện nhiều lần).
        break;
      }
    }

    return lines.join("\n");
  };

  const normalizeRelativePath = (item: UploadedFile) =>
    (item.relativePath || item.file.name).replace(/\\+/g, "/").replace(/^\/+/, "");

  const buildOfflineGeneratedFiles = async (
    textFiles: UploadedFile[],
    videoFiles: UploadedFile[],
    remoteBase: string,
  ): Promise<OfflineGeneratedFile[]> => {
    const generated: OfflineGeneratedFile[] = [];
    let indexHtmlUsed = false;

    for (const item of textFiles) {
      const rawContent = await item.file.text();
      const convertedContent = replaceImagesToBase64(rawContent);
      const ext = item.file.name.split(".").pop()?.toLowerCase();
      const isHtml = ext === "html" || ext === "htm";
      const relativePath = normalizeRelativePath(item);
      const relativeSegments = relativePath.split("/").filter(Boolean);
      const remoteFileName =
        relativeSegments[relativeSegments.length - 1] || item.file.name;
      const remoteDir = relativeSegments.slice(0, -1).join("/");
      const finalName = isHtml && !indexHtmlUsed ? "index.html" : remoteFileName;
      if (isHtml && !indexHtmlUsed) indexHtmlUsed = true;
      const downloadPath =
        `${remoteBase}/${remoteDir ? `${remoteDir}/` : ""}${finalName}`.replace(
          /\/{2,}/g,
          "/",
        );
      const safeName = downloadPath
        .replace(/^\/+/, "")
        .replace(/[<>:"|?*]/g, "_");
      generated.push({
        name: safeName,
        blob: new Blob([convertedContent], {
          type: "text/plain;charset=utf-8",
        }),
      });
    }

    for (const item of videoFiles) {
      const downloadPath =
        `${remoteBase}/${normalizeRelativePath(item)}`.replace(/\/{2,}/g, "/");
      const safeName = downloadPath
        .replace(/^\/+/, "")
        .replace(/[<>:"|?*]/g, "_");
      generated.push({ name: safeName, blob: item.file });
    }

    return generated;
  };

  const downloadOfflineGeneratedFiles = async () => {
    if (offlineGeneratedFiles.length === 0) return;
    setDownloadingOfflineZip(true);
    try {
      const zip = new JSZip();
      offlineGeneratedFiles.forEach((entry) => {
        zip.file(entry.name, entry.blob);
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `offline-demo-${stamp}.zip`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setSendError(
        err instanceof Error
          ? `Cannot create offline zip: ${err.message}`
          : "Cannot create offline zip.",
      );
    } finally {
      setDownloadingOfflineZip(false);
    }
  };

  const handleReplaceBase64AndUploadSftp = async () => {
    setSendError(null);
    setSendSuccess(null);
    setOfflineGeneratedFiles([]);

    const targetPath = sourceUrl.trim();
    if (!targetPath) {
      setSendError("Missing remote source path.");
      return;
    }
    if (!config.model?.trim()) {
      setSendError("Please select a brand before uploading to SFTP.");
      return;
    }
    if (!selectedDemoTitle.trim()) {
      setSendError(
        "Please select a Creative Demo before replacing base64 and uploading to SFTP.",
      );
      return;
    }
    if (files.length === 0) {
      setSendError("Please upload files before sending to SFTP.");
      return;
    }

    const textFiles = files.filter((f) => {
      const ext = `.${f.file.name.split(".").pop() ?? ""}`.toLowerCase();
      return TEXT_EXTS.includes(ext);
    });
    const videoFiles = files.filter((f) => {
      const ext = `.${f.file.name.split(".").pop() ?? ""}`.toLowerCase();
      return VIDEO_EXTS.includes(ext);
    });

    if (textFiles.length === 0 && videoFiles.length === 0) {
      setSendError("No HTML/JS/video files found to upload.");
      return;
    }

    const nameToken = replacementName.trim()
      ? normalizePathToken(replacementName.trim())
      : getUploadedNameToken();
    if (!nameToken || nameToken.length <= 5) {
      setSendError(
        "Tên thư mục demo (segment path cuối) phải trên 5 ký tự — nhập tên mới ở ô bên dưới hoặc đổi tên file HTML/JS.",
      );
      return;
    }

    const remoteBase = `/script/demo/${targetPath}`.replace(/\/{2,}/g, "/");
    const prepareOfflineFallback = async (reason: string) => {
      setPreparingOfflineFiles(true);
      try {
        const generated = await buildOfflineGeneratedFiles(
          textFiles,
          videoFiles,
          remoteBase,
        );
        setOfflineGeneratedFiles(generated);
        setSendError(
          `${reason}\nOffline mode ready: you can download ${generated.length} converted file(s) below.`,
        );
      } catch (err) {
        setSendError(
          `${reason}\nOffline mode failed: ${
            err instanceof Error ? err.message : "cannot prepare local files"
          }`,
        );
      } finally {
        setPreparingOfflineFiles(false);
      }
    };

    try {
      const checkData = await fetchJsonOrThrow<{
        ok?: boolean;
        exists?: boolean;
        error?: string;
      }>(
        `${baseUrl}/api/sftp/exists?scope=demo&path=${encodeURIComponent(remoteBase)}`,
        { headers: sftpRoleHeaders },
      );
      if (!checkData?.ok) {
        await prepareOfflineFallback(
          checkData?.error ||
            "Cannot verify remote path on SFTP. Check server connection.",
        );
        return;
      }
      if (checkData.exists) {
        if (!replacementName.trim()) {
          setSendError(
            "Remote folder already exists on SFTP. Enter a replacement name above, then upload again.",
          );
          return;
        }
        setSendError(
          "Target path still exists on SFTP. Choose a different replacement name.",
        );
        return;
      }
    } catch {
      await prepareOfflineFallback(
        "Cannot verify remote path on SFTP (network error).",
      );
      return;
    }

    setSendingToSftp(true);
    try {
      // Nếu người dùng upload nhiều HTML (.html/.htm), chỉ đổi file đầu tiên thành index.html
      // để tránh ghi đè.
      let indexHtmlUploaded = false;
      const sftpErrors: string[] = [];
      const videoCompressionLogs: string[] = [];
      let uploadedCount = 0;
      for (const item of textFiles) {
        try {
          const rawContent = await item.file.text();
          const convertedContent = replaceImagesToBase64(rawContent);

          const ext = item.file.name.split(".").pop()?.toLowerCase();
          const isHtml = ext === "html" || ext === "htm";
          const relativePath = normalizeRelativePath(item);
          const relativeSegments = relativePath.split("/").filter(Boolean);
          const remoteFileName =
            relativeSegments[relativeSegments.length - 1] || item.file.name;
          const remoteDir = relativeSegments.slice(0, -1).join("/");
          const finalName =
            isHtml && !indexHtmlUploaded ? "index.html" : remoteFileName;
          if (isHtml && !indexHtmlUploaded) indexHtmlUploaded = true;

          const remoteFilePath =
            `${remoteBase}/${remoteDir ? `${remoteDir}/` : ""}${finalName}`.replace(
              /\/{2,}/g,
              "/",
            );

          const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
            `${baseUrl}/api/sftp/write`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(sftpRoleHeaders ?? {}),
              },
              body: JSON.stringify({
                path: remoteFilePath,
                content: convertedContent,
              }),
            },
          );
          if (!data?.ok) {
            sftpErrors.push(
              `${item.file.name}: ${data?.error || "upload failed"}`,
            );
            continue;
          }
          uploadedCount++;
        } catch (err) {
          sftpErrors.push(
            `${item.file.name}: ${
              err instanceof Error ? err.message : "upload failed"
            }`,
          );
        }
      }

      for (const item of videoFiles) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("read failed"));
            reader.readAsDataURL(item.file);
          });
          const remoteFilePath =
            `${remoteBase}/${normalizeRelativePath(item)}`.replace(
              /\/{2,}/g,
              "/",
            );
          const data = await fetchJsonOrThrow<{
            ok?: boolean;
            error?: string;
            video?: {
              originalBytes?: number;
              compressedBytes?: number;
              videoCompressed?: boolean;
            };
          }>(`${baseUrl}/api/sftp/write`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sftpRoleHeaders ?? {}),
            },
            body: JSON.stringify({
              path: remoteFilePath,
              content: base64,
              encoding: "base64",
            }),
          });
          if (!data?.ok) {
            sftpErrors.push(
              `${item.file.name}: ${data?.error || "video upload failed"}`,
            );
            continue;
          }
          const videoMeta = data?.video as
            | {
                originalBytes?: number;
                compressedBytes?: number;
                videoCompressed?: boolean;
              }
            | undefined;
          if (
            videoMeta &&
            Number.isFinite(videoMeta.originalBytes) &&
            Number.isFinite(videoMeta.compressedBytes)
          ) {
            const originalBytes = Number(videoMeta.originalBytes);
            const compressedBytes = Number(videoMeta.compressedBytes);
            if (videoMeta.videoCompressed) {
              const savedRatio =
                originalBytes > 0
                  ? Math.max(0, (1 - compressedBytes / originalBytes) * 100)
                  : 0;
              videoCompressionLogs.push(
                `${item.file.name}: compressed ${formatBytes(originalBytes)} -> ${formatBytes(compressedBytes)} (${savedRatio.toFixed(1)}% saved)`,
              );
            } else {
              videoCompressionLogs.push(
                `${item.file.name}: kept original (${formatBytes(originalBytes)})`,
              );
            }
          }
          uploadedCount++;
        } catch (err) {
          sftpErrors.push(
            `${item.file.name}: ${
              err instanceof Error ? err.message : "video upload failed"
            }`,
          );
        }
      }

      if (uploadedCount === 0) {
        await prepareOfflineFallback(
          sftpErrors.length > 0
            ? sftpErrors.join("\n")
            : "Upload to SFTP failed.",
        );
      } else {
        const compressionNote =
          videoCompressionLogs.length > 0
            ? `\nVideo processing:\n${videoCompressionLogs.join("\n")}`
            : "";
        if (sftpErrors.length > 0) {
          setSendSuccess(
            `Uploaded ${uploadedCount} of ${textFiles.length + videoFiles.length} file(s) to ${remoteBase} (base64 applied where applicable).${compressionNote}`,
          );
          setSendError(`Failed:\n${sftpErrors.join("\n")}`);
        } else {
          setSendSuccess(
            `Uploaded ${textFiles.length + videoFiles.length} file(s) to ${remoteBase} (base64 replacement + video upload).${compressionNote}`,
          );
          setOfflineGeneratedFiles([]);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await openYomediaDemoPreview({
          remotePath: targetPath,
          serverApiUrl: baseUrl,
        });
      }
    } catch (err) {
      await prepareOfflineFallback(
        err instanceof Error ? err.message : "Upload to SFTP failed.",
      );
    } finally {
      setSendingToSftp(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1f2a40]/85 via-[#141b2d]/95 to-[#0f172a] p-6 md:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#4cceac]/20 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Build Demo
            </h1>
          </div>
          <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[9px] ml-4">
            Neural Asset Ingestion & Creative Pipeline
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">
                GPU Usage
              </p>
              <p className="mt-1 text-lg font-black text-[#4cceac]">
                {Math.round(metrics.gpu)}%
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">
                RAM
              </p>
              <p className="mt-1 text-lg font-black text-cyan-300">
                {metrics.ram.toFixed(1)} GB
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">
                Latency
              </p>
              <p className="mt-1 text-lg font-black text-violet-300">
                {Math.round(metrics.latency)} ms
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">
                Health
              </p>
              <p
                className={`mt-1 text-lg font-black ${
                  metrics.health === "Warning"
                    ? "text-amber-300"
                    : "text-emerald-300"
                }`}
              >
                {metrics.health}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Dropzone Area */}
        <div className="xl:col-span-2">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div
                  className={
                    error.type === "partial"
                      ? "bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4"
                      : "bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 flex items-start gap-4"
                  }
                >
                  <div
                    className={
                      error.type === "partial"
                        ? "p-2 bg-amber-500/20 rounded-xl shrink-0"
                        : "p-2 bg-rose-500/20 rounded-xl shrink-0"
                    }
                  >
                    <ExclamationTriangleIcon
                      className={
                        error.type === "partial"
                          ? "w-5 h-5 text-amber-400"
                          : "w-5 h-5 text-rose-400"
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">
                      {error.type === "partial"
                        ? "Partial ingest"
                        : `${error.type} Error Detected`}
                    </h4>
                    <p
                      className={
                        error.type === "partial"
                          ? "text-xs text-amber-100/80 font-medium leading-relaxed whitespace-pre-wrap"
                          : "text-xs text-rose-200/70 font-medium leading-relaxed whitespace-pre-wrap"
                      }
                    >
                      {error.message}
                    </p>
                    {error.action && (
                      <Button
                        onClick={error.action}
                        className={
                          error.type === "partial"
                            ? "mt-3 flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors"
                            : "mt-3 flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors"
                        }
                      >
                        <ArrowPathIcon className="w-3 h-3" />
                        {error.actionLabel || "Retry Action"}
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={() => setError(null)}
                    className={
                      error.type === "partial"
                        ? "text-amber-400/50 hover:text-amber-400 transition-colors"
                        : "text-rose-400/50 hover:text-rose-400 transition-colors"
                    }
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            onClick={() => {
              if (ignoreNextDropzoneClick.current) return;
              fileInputRef.current?.click();
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative h-[340px] rounded-[2.2rem] border border-dashed transition-all duration-500 flex flex-col items-center justify-center p-8 text-center cursor-pointer overflow-hidden group shadow-[0_22px_65px_rgba(2,6,23,0.45)] ${
              isDragging
                ? "border-[#4cceac] bg-[#4cceac]/5 scale-[1.01] shadow-[0_0_50px_rgba(76,206,172,0.1)]"
                : "border-white/10 bg-gradient-to-br from-[#1f2a40]/55 via-[#141b2d]/70 to-[#0f172a]/90 hover:border-[#4cceac]/40 hover:bg-[#1f2a40]/40"
            }`}
          >
            {/* Không phủ full + pointer-events: drop thả nhiều file lên <input> thì Chrome/Edge chỉ gán 1 file */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.html,.htm,.js,.mjs"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error non-standard; enables folder picker in Chromium
              webkitdirectory=""
              directory=""
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Scanning Line Animation */}
            {isDragging && (
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-px bg-gradient-to-r from-transparent via-[#4cceac] to-transparent z-0 opacity-50"
              />
            )}

            <motion.div
              animate={{
                y: isDragging ? -15 : 0,
                scale: isDragging ? 1.1 : 1,
              }}
              className={`w-20 h-20 rounded-[1.3rem] flex items-center justify-center mb-5 relative ${
                isDragging
                  ? "bg-[#4cceac] text-[#141b2d]"
                  : "bg-[#141b2d] text-[#4cceac]"
              } transition-all duration-500 shadow-2xl`}
            >
              <CloudArrowUpIcon className="w-10 h-10" />
              {!isDragging && (
                <div className="absolute inset-0 rounded-[1.3rem] border border-[#4cceac]/20 animate-ping" />
              )}
            </motion.div>

            <h3 className="text-xl font-black text-white mb-2 tracking-tight uppercase italic">
              {isDragging ? "Release to Ingest" : "Drop Assets Here"}
            </h3>
            <p className="text-[#a3a3a3] max-w-sm mx-auto text-[11px] font-medium leading-relaxed tracking-wide">
              INTELLIGENT UPLOAD SYSTEM v2.0
              <br />
              <span className="opacity-60">
                Kéo thả file hoặc cả thư mục (ảnh + HTML/JS)
              </span>
              <br />
              <span className="opacity-60">
                PNG • JPG • WEBP • GIF • SVG • HTML • JS • MAX 10MB
              </span>
            </p>
            <div
              className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#4cceac]/35 bg-[#141b2d]/80 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#4cceac] hover:border-[#4cceac]/60 hover:bg-[#4cceac]/10 transition-colors"
              >
                <FolderOpenIcon className="h-4 w-4" />
                Chọn thư mục
              </Button>
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(76,206,172,0.05)_0%,transparent_70%)]" />
              <div className="absolute top-10 left-10 w-40 h-40 bg-[#4cceac] rounded-full blur-[100px] opacity-20" />
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-500 rounded-full blur-[100px] opacity-20" />
            </div>
          </motion.div>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                Remote Source URL (Optional)
              </label>
            </div>
            <div className="relative group">
              <input
                type="text"
                value={sourceUrl}
                readOnly
                placeholder="2026/03/romano/Laundry/winter/384x683"
                className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-5 px-6 text-sm font-medium text-white outline-none focus:border-[#4cceac]/50 transition-all placeholder-white/10 shadow-xl"
              />
            </div>
          </div>
          {showUploadNameInput && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${directoryExists ? "bg-amber-400" : "bg-[#4cceac]"}`}
                />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  {directoryExists
                    ? "Directory Exists — Replacement Name"
                    : "Đặt tên thư mục demo (bắt buộc)"}
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={replacementName}
                  onChange={(e) => setReplacementName(e.target.value)}
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự (ví dụ: banner-spring-2026)"
                  className={`w-full bg-[#141b2d] border rounded-2xl py-4 px-5 text-sm font-medium text-white outline-none transition-all placeholder-white/20 shadow-xl ${
                    directoryExists
                      ? "border-amber-400/30 focus:border-amber-300"
                      : "border-[#4cceac]/30 focus:border-[#4cceac]/60"
                  }`}
                />
              </div>
              <p
                className={`text-[11px] ${directoryExists ? "text-amber-300/80" : "text-[#4cceac]/80"}`}
              >
                {directoryExists
                  ? "Đường dẫn đã tồn tại trên SFTP — nhập tên mới (trên 5 ký tự) để tránh ghi đè."
                  : "Tên lấy từ file HTML/JS hiện ≤ 5 ký tự — nhập tên thư mục demo tối thiểu 6 ký tự."}
                {checkingDirectory ? " Checking..." : ""}
                {!uploadNameValid && replacementName.trim().length > 0 ? (
                  <span className="block mt-1 text-rose-300/90">
                    Còn thiếu: cần trên 5 ký tự (đã nhập{" "}
                    {normalizePathToken(replacementName.trim()).length}).
                  </span>
                ) : null}
              </p>
            </div>
          )}
          {/* Configuration Section */}
          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-[#141b2d]/85 to-[#0f172a]/95 p-4 md:p-5 shadow-[0_16px_45px_rgba(2,6,23,0.38)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Demo Metadata
                </h3>
                <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                  Configure destination and match the correct creative profile.
                </p>
              </div>
              <span className="rounded-full border border-[#4cceac]/30 bg-[#4cceac]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#4cceac]">
                Smart Mapping
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Creative Demo
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={selectedDemoTitle}
                    onChange={(e) => setSelectedDemoTitle(e.target.value)}
                    className="w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                  >
                    <option value="">
                      {filteredDemoTitleOptions.length > 0
                        ? "Select creative demo..."
                        : "No matched demo title"}
                    </option>
                    {filteredDemoTitleOptions.map((item) => (
                      <option key={item.id} value={item.title}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Brand
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.model}
                    onChange={(e) => {
                      const nextModel = e.target.value;
                      const nextProductCates =
                        getProductCateOptionsByBrand(nextModel);
                      setConfig({
                        ...config,
                        model: nextModel,
                        productCate: nextProductCates.some(
                          (item: any) => item.id === config.productCate,
                        )
                          ? config.productCate
                          : (nextProductCates[0]?.id ?? ""),
                      });
                    }}
                    className={`w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl ${
                      config.model
                        ? getBrandColorClass(config.model)
                        : "text-white"
                    }`}
                  >
                    <option value="" disabled>
                      Select model...
                    </option>
                    {brands.map((item: any) => (
                      <option
                        key={item.id}
                        value={item.id}
                        className={getBrandColorClass(item.label || item.id)}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <BoltIcon className="w-4 h-4 text-[#4cceac]" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Product Category
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.productCate}
                    onChange={(e) =>
                      setConfig({ ...config, productCate: e.target.value })
                    }
                    className="w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                  >
                    {productCateOptions.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Season
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.season}
                    onChange={(e) =>
                      setConfig({ ...config, season: e.target.value })
                    }
                    disabled
                    className="w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                  >
                    {seasons.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Year
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.quality}
                    disabled
                    className="w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none cursor-default shadow-xl"
                  >
                    {years.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <PhotoIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    Month
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.mode}
                    disabled
                    className="w-full bg-[#141b2d] border border-white/5 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none cursor-default shadow-xl"
                  >
                    {months.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <SignalIcon className="w-4 h-4 text-rose-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0f172a]/80 p-4 md:p-5 flex flex-wrap gap-4 items-center shadow-[0_18px_50px_rgba(2,6,23,0.45)]">
            <Button
              type="button"
              onClick={handleReplaceBase64AndUploadSftp}
              disabled={
                !selectedDemoTitle.trim() ||
                !config.model?.trim() ||
                !uploadNameValid ||
                !sourceUrl.trim() ||
                files.length === 0 ||
                sendingToSftp ||
                checkingDirectory ||
                (showUploadNameInput && !replacementName.trim())
              }
              className="px-8 py-4 min-w-[120px] rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-[#3d465d] disabled:to-[#3d465d] disabled:opacity-60 text-white font-black border border-white/10 shadow-[0_8px_24px_rgba(139,92,246,0.25)] transition-all uppercase tracking-widest text-[10px] italic flex items-center justify-center gap-2"
            >
              {sendingToSftp ? "Uploading..." : "Convert and Upload"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFiles([]);
                setSourceUrl("");
                setError(null);
                setSendError(null);
                setSelectedImage(null);
                setSelectedTextFile(null);
                setFilterType("all");
                setReplacementName("");
                setDirectoryExists(false);
                setCheckingDirectory(false);
                setSendSuccess(null);
                setOfflineGeneratedFiles([]);
              }}
              disabled={files.length === 0 && !sourceUrl}
              className="px-8 py-4 min-w-[120px] bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-black rounded-2xl border border-white/10 transition-all uppercase tracking-widest text-[10px] italic flex items-center justify-center"
            >
              Reset
            </Button>
          </div>
          {sendError && (
            <p className="mt-2 text-sm text-red-400 font-medium">{sendError}</p>
          )}
          {sendSuccess && (
            <p className="mt-2 text-sm text-emerald-400 font-medium">
              {sendSuccess}
            </p>
          )}
          {offlineGeneratedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={downloadOfflineGeneratedFiles}
                disabled={downloadingOfflineZip}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/30 text-amber-200 text-[11px] font-black uppercase tracking-widest"
              >
                {downloadingOfflineZip
                  ? "Creating ZIP..."
                  : `Download Offline ZIP (${offlineGeneratedFiles.length})`}
              </Button>
              <span className="text-[11px] text-amber-200/90">
                Files are converted with base64 and bundled in one zip.
              </span>
            </div>
          )}
          {preparingOfflineFiles && (
            <p className="mt-2 text-xs text-amber-200/90">
              Preparing offline package...
            </p>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="bg-gradient-to-b from-[#141b2d]/95 to-[#0b1220] rounded-[3rem] border border-white/10 p-8 shadow-[0_24px_70px_rgba(2,6,23,0.55)] flex flex-col h-[700px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4cceac]/20 to-transparent" />

          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">
                Asset Review
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-bold text-[#a3a3a3] uppercase tracking-[0.2em]">
                  Staging Environment
                </span>
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-0.5 border border-white/5">
                  <Button
                    onClick={() => setFilterType("all")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all ${filterType === "all" ? "bg-[#4cceac] text-[#141b2d]" : "text-[#a3a3a3] hover:text-white"}`}
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => setFilterType("recent")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all ${filterType === "recent" ? "bg-[#4cceac] text-[#141b2d]" : "text-[#a3a3a3] hover:text-white"}`}
                  >
                    Recent
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-[#4cceac]/10 text-[#4cceac] text-[10px] font-black px-4 py-1.5 rounded-full border border-[#4cceac]/20 uppercase tracking-widest">
              {files.length} Units
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            <AnimatePresence initial={false}>
              {files.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center text-[#3d465d]"
                >
                  <PhotoIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No assets uploaded yet</p>
                </motion.div>
              ) : (
                files
                  .filter(
                    (file) =>
                      filterType === "all" ||
                      Date.now() - file.timestamp < 300000,
                  ) // Recent = last 5 minutes
                  .map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      className="group relative bg-[#141b2d] rounded-2xl p-3 border border-[#3d465d] flex items-center gap-4 hover:border-[#4cceac]/30 transition-all"
                    >
                      <div
                        onClick={() => {
                          const ext =
                            `.${file.file.name.split(".").pop() ?? ""}`.toLowerCase();
                          if (file.file.type.startsWith("image/")) {
                            setSelectedImage(file.preview);
                          } else if (
                            TEXT_EXTS.includes(ext) ||
                            [
                              "text/html",
                              "application/xhtml+xml",
                              "application/javascript",
                              "text/javascript",
                            ].includes(file.file.type)
                          ) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setSelectedTextFile({
                                name: file.file.name,
                                content: String(reader.result ?? ""),
                                mode: "view",
                              });
                            };
                            reader.readAsText(file.file);
                          }
                        }}
                        className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1f2a40] shrink-0 border border-white/10 cursor-zoom-in hover:scale-110 transition-all duration-500 shadow-lg flex items-center justify-center"
                      >
                        {file.preview && file.file.type.startsWith("image/") ? (
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#4cceac]">
                              Preview
                            </span>
                            <span className="mt-1 text-[10px] text-slate-300 truncate px-2">
                              {file.file.name.split(".").pop()?.toUpperCase() ||
                                "FILE"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate pr-6 tracking-tight">
                          {file.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-1 h-1 rounded-full bg-[#4cceac]" />
                          <p className="text-[9px] text-[#a3a3a3] font-black uppercase tracking-widest">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex gap-1 items-center">
                        {file.file.type.startsWith("image/") &&
                          file.imageBase64 && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                  file.imageBase64!.base64,
                                );
                              }}
                              className="bg-[#4cceac]/20 text-[#4cceac] p-0.5 rounded-full hover:bg-[#4cceac]/40 transition-all opacity-0 group-hover:opacity-100"
                              title={`Copy base64: ${file.imageBase64.name}`}
                            >
                              <ClipboardDocumentIcon className="w-3 h-3" />
                            </Button>
                          )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="bg-red-500/20 text-red-400 p-0.5 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Image Review Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-[#141b2d]/90 backdrop-blur-xl flex items-center justify-center p-10 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
            >
              <img
                src={selectedImage}
                alt="Review"
                className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl border border-white/10 object-contain"
              />
              <Button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-[#e0e0e0] hover:text-[#4cceac] transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
              >
                <XMarkIcon className="w-6 h-6" />
                Close Review
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text file view / edit modal */}
      <AnimatePresence>
        {selectedTextFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-x-0 bottom-0 z-[90] px-8 pb-8"
          >
            <div className="max-w-5xl mx-auto rounded-3xl bg-[#020617] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.75)] p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                    {selectedTextFile.mode === "edit"
                      ? "Edit file"
                      : "View file"}
                  </span>
                  <span className="text-xs text-[#e5e7eb] truncate max-w-[360px]">
                    {selectedTextFile.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      setSelectedTextFile({
                        ...selectedTextFile,
                        mode:
                          selectedTextFile.mode === "edit" ? "view" : "edit",
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-[10px] text-[#e5e7eb] uppercase tracking-widest hover:bg-white/10"
                  >
                    {selectedTextFile.mode === "edit" ? "View only" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedTextFile(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-[10px] text-[#e5e7eb] uppercase tracking-widest hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
              </div>
              <textarea
                value={selectedTextFile.content}
                onChange={(e) =>
                  selectedTextFile.mode === "edit"
                    ? setSelectedTextFile({
                        ...selectedTextFile,
                        content: e.target.value,
                      })
                    : undefined
                }
                readOnly={selectedTextFile.mode === "view"}
                className="w-full min-h-[220px] bg-[#020617] border border-[#1f2937] rounded-2xl px-4 py-3 text-xs font-mono text-[#e5e7eb] resize-vertical outline-none focus:border-[#4cceac]/60"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BuildDemo;
