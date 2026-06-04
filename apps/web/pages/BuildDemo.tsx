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
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import demoConfig from "../data/demoConfig.json";
import { getBrandColorClass } from "../lib/brandColors";
import { openYomediaDemoPreview } from "../components/OpenDemo";
import { useAuth } from "../contexts/AuthContext";
import { recordActivity } from "../lib/activityLog";
import { fetchJsonOrThrow } from "../lib/apiError";
import { api } from "../lib/trpc/api";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import { createSftpClient } from "../lib/sftpClient";
import Button from "../components/Button";
import NoticePopup from "../components/NoticePopup";
import JSZip from "jszip";
import { useAdminOfflineMode } from "../hooks/useAdminOfflineMode";
import { isBuildDemoBrandAllowed } from "../lib/buildDemoBrands";
import {
  compressImageToDataUrl,
  isSftpExistingEntry,
  resolveFreeRemoteSegment,
  stripRedundantRelativeFolderPrefix,
} from "../lib/buildDemo";
import {
  replaceImagesToBase64 as applyImagesToBase64InContent,
  type ImageBase64Entry,
  VIDEO_DEMO_FIXED_REL_PATH,
  buildVideoMakeVastXml,
} from "../lib/buildDemoAssets";
import {
  getBuildDemoUploadResultStorageKey,
  loadPersistedBuildDemoUploadResult,
  persistBuildDemoUploadResult,
} from "../lib/buildDemoUploadResultStorage";

type BuildDemoRolePermissions = Record<
  string,
  {
    manageDemo?: {
      canSetupMediaSftp?: boolean;
      canSftpUploadBinary?: boolean;
      canSftpWriteFile?: boolean;
    };
  }
>;

interface ErrorState {
  message: string;
  type: "validation" | "processing" | "system" | "partial";
  action?: () => void;
  actionLabel?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  relativePath: string;
  preview: string;
  status: "uploading" | "success" | "error";
  timestamp: number;
  /** Images: store filename + base64 together in state */
  imageBase64?: ImageBase64Entry;
}

interface DemoTitleOption {
  id: string;
  title: string;
  size: string | string[];
  /** Display / Video / Mobile â€” drives idpc vs idvd vs idmb preview. */
  category?: string;
  /** From creative-demos.json (e.g. HTML5, VIDEO). */
  fileType?: string;
  /** Preview `f=` for idvd/VAST flow (e.g. instream, outstream). */
  value?: string;
}

interface OfflineGeneratedFile {
  name: string;
  blob: Blob;
}

interface OfflinePackagePopupPayload {
  kind: "success" | "fallback";
  summary: string;
  uploadIssueSummary?: string;
}

interface SftpMediaSetupResult {
  status: "idle" | "success" | "error";
  mediaRemotePath?: string;
  copiedFiles?: number;
  copiedDirectories?: number;
  error?: string;
}

interface SftpUploadPopupPayload {
  kind: "full" | "partial";
  targetPath: string;
  remoteBase: string;
  uploadedCount: number;
  totalFiles: number;
  videoLogs: string[];
  failureDetails?: string;
  meta: {
    creativeDemo: string;
    /** creative-demos.json `value` for demo.yomedia `f=` (video/idvd preview). */
    demoValue: string;
    /** Catalog category: idvd/VAST only when this is `Video`, not for Mobile in-page MP4. */
    demoCategory: string;
    brand: string;
    productCate: string;
    demoFormat: string;
    year: string;
    month: string;
  };
  setup?: SftpMediaSetupResult;
}

/** Snapshot after a full SFTP upload â€” used to reopen preview without re-uploading files. */
interface LastSuccessfulSftpUpload {
  targetPath: string;
  remoteBase: string;
  uploadFingerprint: string;
  previewHostTemplate: "default" | "eva" | "tuoitre";
  selectedDemoId: string;
  uploadedCount: number;
  totalFiles: number;
  videoLogs: string[];
  setup?: SftpMediaSetupResult;
}

function buildSftpUploadFingerprint(input: {
  files: File[];
  sourceUrl: string;
  replacementName: string;
  model: string;
  quality: string;
  mode: string;
  productCate: string;
  demoFormat: string;
}): string {
  const fileKeys = [...input.files]
    .map((f) => fileDedupeKey(f))
    .sort()
    .join("\n");
  return JSON.stringify({
    files: fileKeys,
    sourceUrl: input.sourceUrl.trim(),
    replacementName: input.replacementName.trim(),
    model: input.model,
    quality: input.quality,
    mode: input.mode,
    productCate: input.productCate,
    demoFormat: input.demoFormat,
  });
}

/** Safe segment for download filenames (Banner zip, etc.). */
function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"|?*/\\]/g, "_")
    .replace(/\s+/g, "_");
}

function formatMediaSetupPath(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/^\/?media\/?/i, "")
    .replace(/^\/+/, "");
}

/** Offline ZIP: skip vendor/lib trees (manifest URLs are rewritten to CDN in converted HTML/JS). */
const OFFLINE_PACKAGE_SKIP_REL_PATH_RE = /(^|\/)(libs?|node_modules)(\/|$)/i;

/** Unique basenames at zip root (avoid collisions when flattening paths). */
function uniquifyZipEntryNames(wanted: string[]): string[] {
  const seen = new Map<string, number>();
  return wanted.map((name) => {
    const leaf = name.split(/[/\\]/).pop() ?? name;
    const n = seen.get(leaf.toLowerCase()) ?? 0;
    seen.set(leaf.toLowerCase(), n + 1);
    if (n === 0) return leaf;
    const ext = leaf.includes(".") ? `.${leaf.split(".").pop()}` : "";
    const base = ext ? leaf.slice(0, -ext.length) : leaf;
    return `${base}_${n + 1}${ext}`;
  });
}

/** Read every DirectoryReader batch (Chrome yields up to ~100 entries per batch). */
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

/** Relative path when drag-dropping folders â€” cannot set on File (webkitRelativePath is read-only). */
const dropRelativePathByFile = new WeakMap<File, string>();

/**
 * Collect every file in a dropped folder tree.
 * Relative paths live in a WeakMap so dedupe stays correct when names repeat in subfolders.
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
 * When dragging a folder from Explorer, dataTransfer.files may include a placeholder File (0 bytes, no extension).
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
  const { enabled: adminOfflineMode } = useAdminOfflineMode();
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const isAdminUser = normalizedRole === "admin";
  const allBrands = (demoConfig as any).ListBrands ?? [];
  const allowedBuildDemoBrands = user?.allowedBuildDemoBrands;
  const brands = React.useMemo(() => {
    if (allowedBuildDemoBrands === null) {
      return allBrands;
    }
    if (!allowedBuildDemoBrands || allowedBuildDemoBrands.length === 0) {
      return [];
    }
    return allBrands.filter((item: { id?: string }) =>
      isBuildDemoBrandAllowed(String(item.id ?? ""), allowedBuildDemoBrands),
    );
  }, [allBrands, allowedBuildDemoBrands]);
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
  const demoFormats = ["HTML", "Video"] as const;
  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
  const VIDEO_EXTS = [".mp4", ".webm", ".mov"];
  const TEXT_EXTS = [".html", ".htm", ".js", ".mjs"];

  const now = new Date();
  const currentYearLabel = String(now.getFullYear());
  const currentMonthLabel = String(now.getMonth() + 1).padStart(2, "0");

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
  const [config, setConfig] = useState<{
    model: string;
    quality: string;
    mode: string;
    productCate: string;
    demoFormat: (typeof demoFormats)[number];
  }>({
    model: "",
    quality: currentYearId,
    mode: currentMonthId,
    productCate: productCates[0]?.id ?? "",
    demoFormat: demoFormats[0],
  });
  const [sourceUrl, setSourceUrl] = useState("");
  const [directoryExists, setDirectoryExists] = useState(false);
  const [checkingDirectory, setCheckingDirectory] = useState(false);
  const [replacementName, setReplacementName] = useState("");
  /** Video, no replacement folder: last path segment rotates `video`, `video-1`, â€¦ until SFTP is free. */
  const [videoAutoDirSegment, setVideoAutoDirSegment] = useState("video");
  /** HTML/JS uploads auto-rotate final folder segment: `970x250`, `970x250-1`, ... */
  const [htmlAutoDirSegment, setHtmlAutoDirSegment] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "recent">("all");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendingToSftp, setSendingToSftp] = useState(false);
  const [buildProgressText, setBuildProgressText] = useState<string | null>(
    null,
  );
  const [offlineGeneratedFiles, setOfflineGeneratedFiles] = useState<
    OfflineGeneratedFile[]
  >([]);
  const [offlinePackagePayload, setOfflinePackagePayload] =
    useState<OfflinePackagePopupPayload | null>(null);
  const [offlinePackageDialogOpen, setOfflinePackageDialogOpen] =
    useState(false);
  const [sftpUploadPopupPayload, setSftpUploadPopupPayload] =
    useState<SftpUploadPopupPayload | null>(null);
  const [sftpUploadDialogOpen, setSftpUploadDialogOpen] = useState(false);
  const [settingUpMedia, setSettingUpMedia] = useState(false);
  const [preparingOfflineFiles, setPreparingOfflineFiles] = useState(false);
  const [downloadingOfflineZip, setDownloadingOfflineZip] = useState(false);
  const [openingDemoVideo, setOpeningDemoVideo] = useState(false);
  const [demoTitleOptions, setDemoTitleOptions] = useState<DemoTitleOption[]>(
    [],
  );
  const [selectedDemoId, setSelectedDemoId] = useState("");
  const [selectedDemoCategory, setSelectedDemoCategory] = useState("");
  const [previewHostTemplate, setPreviewHostTemplate] = useState<
    "default" | "eva" | "tuoitre"
  >("default");
  const [lastSuccessfulSftpUpload, setLastSuccessfulSftpUpload] =
    useState<LastSuccessfulSftpUpload | null>(null);
  const buildDemoUploadResultStorageKey = React.useMemo(
    () => getBuildDemoUploadResultStorageKey(user?.email),
    [user?.email],
  );
  const [uploadResultStorageReady, setUploadResultStorageReady] =
    useState(false);
  const prevDemoFormatRef = useRef<(typeof demoFormats)[number] | null>(null);
  const [metrics, setMetrics] = useState({
    gpu: 12,
    ram: 2.4,
    latency: 18,
    health: "Optimal",
  });
  const productCateOptions = getProductCateOptionsByBrand(config.model);
  const baseUrl = serverApiOrigin();

  React.useEffect(() => {
    if (!config.model?.trim()) return;
    if (isBuildDemoBrandAllowed(config.model, allowedBuildDemoBrands)) return;
    const fallbackId = String(brands[0]?.id ?? "").trim();
    if (!fallbackId) {
      setConfig((prev) => ({ ...prev, model: "", productCate: "" }));
      return;
    }
    const nextProductCates = getProductCateOptionsByBrand(fallbackId);
    setConfig((prev) => ({
      ...prev,
      model: fallbackId,
      productCate: nextProductCates.some(
        (item: { id?: string }) => item.id === prev.productCate,
      )
        ? prev.productCate
        : (nextProductCates[0]?.id ?? ""),
    }));
  }, [allowedBuildDemoBrands, brands, config.model]);
  const sftpClient = React.useMemo(
    () =>
      createSftpClient({
        roleHeader: normalizedRole || undefined,
      }),
    [normalizedRole],
  );

  const [buildDemoPermissions, setBuildDemoPermissions] =
    useState<BuildDemoRolePermissions>({
      default: {
        manageDemo: {
          canSetupMediaSftp: false,
          canSftpUploadBinary: false,
          canSftpWriteFile: false,
        },
      },
    });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.permissions.get();
        if (!cancelled && data.permissions) {
          setBuildDemoPermissions(data.permissions);
        }
      } catch {
        // keep default false
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  useEffect(() => {
    setUploadResultStorageReady(false);
    const persisted = loadPersistedBuildDemoUploadResult(
      buildDemoUploadResultStorageKey,
    );
    setSftpUploadPopupPayload(
      (persisted?.sftpUploadPopupPayload as SftpUploadPopupPayload | null) ??
        null,
    );
    setLastSuccessfulSftpUpload(
      (persisted?.lastSuccessfulSftpUpload as LastSuccessfulSftpUpload | null) ??
        null,
    );
    setUploadResultStorageReady(true);
  }, [buildDemoUploadResultStorageKey]);

  useEffect(() => {
    if (!uploadResultStorageReady) return;
    persistBuildDemoUploadResult(buildDemoUploadResultStorageKey, {
      sftpUploadPopupPayload,
      lastSuccessfulSftpUpload,
    });
  }, [
    buildDemoUploadResultStorageKey,
    uploadResultStorageReady,
    sftpUploadPopupPayload,
    lastSuccessfulSftpUpload,
  ]);

  const bdSftp =
    buildDemoPermissions[normalizedRole]?.manageDemo ??
    buildDemoPermissions.default?.manageDemo;
  const canBuildDemoMediaSetup = bdSftp?.canSetupMediaSftp === true;
  const canBuildDemoSftpPut =
    bdSftp?.canSftpUploadBinary === true && bdSftp?.canSftpWriteFile === true;
  const buildBusy = buildProgressText !== null;

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

  const fileExtLower = (f: UploadedFile) =>
    `.${f.file.name.split(".").pop() ?? ""}`.toLowerCase();

  const isUploadedVideoFile = (f: UploadedFile) =>
    VIDEO_EXTS.includes(fileExtLower(f));

  const getUploadedNameToken = () => {
    const firstHtml = files.find((f) =>
      ["text/html", "application/xhtml+xml"].includes(f.file.type),
    );
    const firstJs = files.find((f) =>
      ["application/javascript", "text/javascript"].includes(f.file.type),
    );
    const firstVideo = files.find((f) => isUploadedVideoFile(f));
    const picked = firstHtml ?? firstJs ?? firstVideo ?? files[0];
    if (!picked) return "";
    return normalizePathToken(picked.file.name.replace(/\.[^.]+$/, ""));
  };

  const normalizedReplacementName = replacementName.trim()
    ? normalizePathToken(replacementName.trim())
    : "";
  const autoUploadNameToken =
    config.demoFormat === "Video" ? "" : getUploadedNameToken();
  const effectiveUploadNameToken =
    normalizedReplacementName || htmlAutoDirSegment || autoUploadNameToken;
  const htmlAutoRenamed =
    config.demoFormat !== "Video" &&
    !replacementName.trim() &&
    htmlAutoDirSegment.length > 0 &&
    htmlAutoDirSegment !== autoUploadNameToken;
  /** Final path segment must be > 5 characters (minimum 6). */
  const uploadNameValid =
    config.demoFormat === "Video"
      ? normalizedReplacementName.length === 0 ||
        normalizedReplacementName.length > 5
      : effectiveUploadNameToken.length > 5;
  const showUploadNameInput =
    directoryExists ||
    htmlAutoRenamed ||
    (files.length > 0 &&
      (config.demoFormat === "Video"
        ? isAdminUser
        : autoUploadNameToken.length === 0 || autoUploadNameToken.length <= 5));

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

  const getDemoFormatSegment = () =>
    normalizePathToken(config.demoFormat.toLowerCase());

  const buildRemoteRootSegments = () => {
    const year = getItemLabelById(years, config.quality);
    const month = getItemLabelById(months, config.mode).padStart(2, "0");
    const brand = normalizePathToken(
      getItemLabelById(brands, config.model).toLowerCase(),
    );
    const productCate = normalizePathToken(
      getItemLabelById(productCates, config.productCate).toLowerCase(),
    );
    return [year, month, brand, productCate];
  };

  const buildRemoteBaseSegments = (formatDirSegment?: string) => {
    const demoFormatSeg = getDemoFormatSegment();
    const formatDirSeg =
      formatDirSegment ??
      (config.demoFormat === "Video" && !replacementName.trim()
        ? videoAutoDirSegment || demoFormatSeg
        : demoFormatSeg);
    return [...buildRemoteRootSegments(), formatDirSeg];
  };

  const resolveAvailableRemoteSegment = useCallback(
    (prefixSegments: string[], baseSeg: string) =>
      resolveFreeRemoteSegment(sftpClient, prefixSegments, baseSeg),
    [sftpClient],
  );

  const buildRemoteSourcePath = () => {
    const demoFormatSeg = getDemoFormatSegment();
    const formatDirSeg =
      config.demoFormat === "Video" && !replacementName.trim()
        ? videoAutoDirSegment || demoFormatSeg
        : demoFormatSeg;
    const uploadName = replacementName.trim()
      ? normalizePathToken(replacementName.trim())
      : config.demoFormat === "Video"
        ? ""
        : htmlAutoDirSegment || getUploadedNameToken();

    const segments = [...buildRemoteRootSegments(), formatDirSeg];
    if (uploadName) segments.push(uploadName);

    return segments.filter(Boolean).join("/");
  };

  useEffect(() => {
    setSourceUrl(buildRemoteSourcePath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, files, replacementName, videoAutoDirSegment, htmlAutoDirSegment]);

  useEffect(() => {
    const isVideoAutoRemote =
      files.length > 0 &&
      config.demoFormat === "Video" &&
      !replacementName.trim();

    if (!isVideoAutoRemote) {
      setVideoAutoDirSegment(
        normalizePathToken(config.demoFormat.toLowerCase()),
      );
      setCheckingDirectory(false);
      return;
    }

    let cancelled = false;
    const resolveVideoDir = async () => {
      setCheckingDirectory(true);
      setDirectoryExists(false);
      try {
        const baseSeg = getDemoFormatSegment();
        setVideoAutoDirSegment(baseSeg);
        const result = await resolveAvailableRemoteSegment(
          buildRemoteRootSegments(),
          baseSeg,
        );
        if (cancelled) return;

        if (result.exhausted) {
          setDirectoryExists(true);
        } else {
          setVideoAutoDirSegment(result.segment);
          setDirectoryExists(false);
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

    void resolveVideoDir();
    return () => {
      cancelled = true;
    };
    // Intentionally omit sourceUrl / videoAutoDirSegment: avoid re-resolving after each pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    files.length,
    replacementName,
    config.demoFormat,
    config.model,
    config.quality,
    config.mode,
    config.productCate,
    sftpClient,
  ]);

  useEffect(() => {
    const isHtmlAutoRemote =
      files.length > 0 &&
      config.demoFormat !== "Video" &&
      !replacementName.trim() &&
      autoUploadNameToken.length > 5;

    if (config.demoFormat === "Video") {
      setHtmlAutoDirSegment("");
      return;
    }

    if (!isHtmlAutoRemote) {
      setHtmlAutoDirSegment(autoUploadNameToken);
      setCheckingDirectory(false);
      return;
    }

    let cancelled = false;
    const resolveHtmlDir = async () => {
      setCheckingDirectory(true);
      setDirectoryExists(false);
      try {
        const baseSeg = autoUploadNameToken;
        const result = await resolveAvailableRemoteSegment(
          buildRemoteBaseSegments(getDemoFormatSegment()),
          baseSeg,
        );
        if (cancelled) return;

        if (result.exhausted) {
          setHtmlAutoDirSegment(baseSeg);
          setDirectoryExists(true);
        } else {
          setHtmlAutoDirSegment(result.segment);
          setDirectoryExists(false);
        }
      } catch {
        if (!cancelled) {
          setHtmlAutoDirSegment(autoUploadNameToken);
          setDirectoryExists(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingDirectory(false);
        }
      }
    };

    void resolveHtmlDir();
    return () => {
      cancelled = true;
    };
  }, [
    autoUploadNameToken,
    files.length,
    replacementName,
    config.demoFormat,
    config.model,
    config.quality,
    config.mode,
    config.productCate,
    resolveAvailableRemoteSegment,
  ]);

  useEffect(() => {
    const targetPath = sourceUrl.trim();
    if (!targetPath || files.length === 0) {
      setDirectoryExists(false);
      setCheckingDirectory(false);
      return;
    }

    const isVideoAutoRemote =
      config.demoFormat === "Video" && !replacementName.trim();
    const isHtmlAutoRemote =
      config.demoFormat !== "Video" &&
      !replacementName.trim() &&
      autoUploadNameToken.length > 5;
    if (isVideoAutoRemote || isHtmlAutoRemote) {
      return;
    }

    let cancelled = false;
    const checkDirectory = async () => {
      setCheckingDirectory(true);
      try {
        const data = await sftpClient.exists(
          `/script/demo/${targetPath}`,
          "demo",
        );
        if (!cancelled) {
          setDirectoryExists(isSftpExistingEntry(data));
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
  }, [
    sourceUrl,
    files.length,
    config.demoFormat,
    replacementName,
    autoUploadNameToken,
    sftpClient,
  ]);

  useEffect(() => {
    let cancelled = false;
    const loadDemoTitles = async () => {
      try {
        const data = await api.creative.demoTitles(false);
        const items = Array.isArray(data.items)
          ? data.items
              .map((item) => ({
                id: String(item?.id ?? "").trim(),
                title: String(item?.title ?? "").trim(),
                category: String(
                  (item as { category?: string })?.category ?? "",
                ).trim(),
                fileType: String(
                  (item as { fileType?: string })?.fileType ?? "",
                ).trim(),
                value: String((item as { value?: string })?.value ?? "").trim(),
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
      prevDemoFormatRef.current !== null &&
      prevDemoFormatRef.current !== config.demoFormat
    ) {
      setFiles((prev) => {
        for (const f of prev) {
          if (f.preview) URL.revokeObjectURL(f.preview);
        }
        return [];
      });
      setSelectedDemoId("");
      setSelectedDemoCategory("");
      setReplacementName("");
      setError(null);
      setSendError(null);
      setSelectedImage(null);
      setSelectedTextFile(null);
      setOfflineGeneratedFiles([]);
      setOfflinePackagePayload(null);
      setOfflinePackageDialogOpen(false);
      setSftpUploadPopupPayload(null);
      setSftpUploadDialogOpen(false);
      setLastSuccessfulSftpUpload(null);
      setDirectoryExists(false);
      setVideoAutoDirSegment(
        normalizePathToken(config.demoFormat.toLowerCase()),
      );
    }
    prevDemoFormatRef.current = config.demoFormat;
  }, [config.demoFormat]);

  const currentSftpUploadFingerprint = React.useMemo(
    () =>
      buildSftpUploadFingerprint({
        files: files.map((f) => f.file),
        sourceUrl,
        replacementName,
        model: config.model,
        quality: config.quality,
        mode: config.mode,
        productCate: config.productCate,
        demoFormat: config.demoFormat,
      }),
    [
      files,
      sourceUrl,
      replacementName,
      config.model,
      config.quality,
      config.mode,
      config.productCate,
      config.demoFormat,
    ],
  );

  const sftpPreviewOnlyReopen =
    !adminOfflineMode &&
    lastSuccessfulSftpUpload !== null &&
    lastSuccessfulSftpUpload.uploadFingerprint ===
      currentSftpUploadFingerprint &&
    lastSuccessfulSftpUpload.targetPath === sourceUrl.trim() &&
    (lastSuccessfulSftpUpload.previewHostTemplate !== previewHostTemplate ||
      lastSuccessfulSftpUpload.selectedDemoId !== selectedDemoId);

  useEffect(() => {
    if (
      selectedDemoId &&
      !demoTitleOptions.some((item) => item.id === selectedDemoId)
    ) {
      setSelectedDemoId("");
    }
  }, [demoTitleOptions, selectedDemoId]);

  const sizeMatchedDemoTitleOptions = React.useMemo(() => {
    if (config.demoFormat === "Video") return [];
    return demoTitleOptions.filter((item) => {
      const sizesRaw = Array.isArray(item.size) ? item.size : [item.size];
      return sizesRaw.some((s) => {
        const token = normalizeMatchToken(String(s ?? ""));
        return token && fileNameTokens.has(token);
      });
    });
  }, [demoTitleOptions, fileNameTokens, config.demoFormat]);

  const matchedDemoCategories = React.useMemo(() => {
    const categories: string[] = [];
    for (const item of sizeMatchedDemoTitleOptions) {
      const category = String(item.category ?? "").trim();
      if (!category || categories.includes(category)) continue;
      categories.push(category);
    }
    return categories;
  }, [sizeMatchedDemoTitleOptions]);

  const showDemoCategoryPicker =
    config.demoFormat !== "Video" && matchedDemoCategories.length > 1;

  useEffect(() => {
    if (config.demoFormat === "Video") {
      if (selectedDemoCategory) {
        setSelectedDemoCategory("");
      }
      return;
    }

    if (matchedDemoCategories.length === 1) {
      const onlyCategory = matchedDemoCategories[0] ?? "";
      if (selectedDemoCategory !== onlyCategory) {
        setSelectedDemoCategory(onlyCategory);
      }
      return;
    }

    if (
      selectedDemoCategory &&
      matchedDemoCategories.includes(selectedDemoCategory)
    ) {
      return;
    }

    if (selectedDemoCategory) {
      setSelectedDemoCategory("");
    }
  }, [config.demoFormat, matchedDemoCategories, selectedDemoCategory]);

  const categoryScopedDemoTitleOptions = React.useMemo(() => {
    if (config.demoFormat === "Video") {
      return demoTitleOptions.filter(
        (item) => String(item.fileType ?? "").toUpperCase() === "VIDEO",
      );
    }
    if (showDemoCategoryPicker && !selectedDemoCategory) {
      return [];
    }
    return sizeMatchedDemoTitleOptions.filter(
      (item) =>
        !showDemoCategoryPicker ||
        String(item.category ?? "").trim() === selectedDemoCategory,
    );
  }, [
    config.demoFormat,
    demoTitleOptions,
    selectedDemoCategory,
    showDemoCategoryPicker,
    sizeMatchedDemoTitleOptions,
  ]);

  const selectedDemoOption = React.useMemo(
    () => demoTitleOptions.find((item) => item.id === selectedDemoId),
    [demoTitleOptions, selectedDemoId],
  );

  const buildSftpUploadMetaSnapshot =
    useCallback((): SftpUploadPopupPayload["meta"] => {
      const pickedDemo = selectedDemoOption;
      return {
        creativeDemo: pickedDemo?.title?.trim() || "â€”",
        demoValue: pickedDemo?.value?.trim() ?? "",
        demoCategory: pickedDemo?.category?.trim() ?? "",
        brand: getItemLabelById(brands, config.model),
        productCate: getItemLabelById(productCates, config.productCate),
        demoFormat: config.demoFormat,
        year: getItemLabelById(years, config.quality),
        month: getItemLabelById(months, config.mode).padStart(2, "0"),
      };
    }, [
      selectedDemoOption,
      brands,
      config.model,
      config.productCate,
      config.demoFormat,
      config.quality,
      productCates,
      years,
      months,
    ]);

  const creativeDemoPlaceholder = React.useMemo(() => {
    if (config.demoFormat === "Video") {
      return categoryScopedDemoTitleOptions.length > 0
        ? "Select video creative demo..."
        : "No VIDEO demos in catalog";
    }
    if (showDemoCategoryPicker && !selectedDemoCategory) {
      return "Select category first...";
    }
    return categoryScopedDemoTitleOptions.length > 0
      ? "Select creative demo..."
      : "No matched demo title";
  }, [
    config.demoFormat,
    categoryScopedDemoTitleOptions.length,
    selectedDemoCategory,
    showDemoCategoryPicker,
  ]);

  useEffect(() => {
    if (
      selectedDemoId &&
      !categoryScopedDemoTitleOptions.some((item) => item.id === selectedDemoId)
    ) {
      setSelectedDemoId("");
    }
  }, [categoryScopedDemoTitleOptions, selectedDemoId]);

  useEffect(() => {
    if (categoryScopedDemoTitleOptions.length !== 1) return;
    const onlyId = categoryScopedDemoTitleOptions[0]?.id ?? "";
    if (!onlyId || selectedDemoId === onlyId) return;
    setSelectedDemoId(onlyId);
  }, [categoryScopedDemoTitleOptions, selectedDemoId]);

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

      if (config.demoFormat === "Video") {
        if (!isVideoExt && !file.type.startsWith("video/")) {
          validationErrors.push(
            `${file.name}: Video flow accepts MP4 / WebM / MOV only.`,
          );
          return;
        }
      }

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
    const guidelinesAction = () => setGuidelinesOpen(true);

    if (config.demoFormat === "Video" && fileArray.length > 0) {
      const pickedVideos = fileArray.filter((entry) =>
        VIDEO_EXTS.includes(fileExtLower(entry)),
      );
      if (pickedVideos.length > 1) {
        setError({
          type: "validation",
          message: `Video flow: drag or choose exactly one MP4/WebM/MOV (found ${pickedVideos.length}).`,
          actionLabel: "View Guidelines",
          action: guidelinesAction,
        });
        return;
      }
      if (pickedVideos.length === 1) {
        if (allSkipped.length > 0) {
          setError({
            type: "partial",
            message: `Added one video file. Skipped ${allSkipped.length}:\n${allSkipped.join("\n")}`,
            actionLabel: "View Guidelines",
            action: guidelinesAction,
          });
        }
        setFiles((prev) => {
          for (const f of prev) {
            if (f.preview) URL.revokeObjectURL(f.preview);
          }
          return [pickedVideos[0]!];
        });
        return;
      }
    }

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

  const handleFilesRef = useRef(handleFiles);
  handleFilesRef.current = handleFiles;

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    ignoreNextDropzoneClick.current = true;
    window.setTimeout(() => {
      ignoreNextDropzoneClick.current = false;
    }, 400);

    // Snapshot items/files synchronously before any await: after await, DataTransfer may be invalid,
    // so only the first item would be handled (drops with folder + html + js lose files otherwise).
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

    // Merge in FileList too (some Windows/Chrome builds add html/js here alongside items).
    const merged = mergeDroppedFiles([...allFiles, ...fileListFallback]);
    if (merged.length === 0) return;

    const dt = new DataTransfer();
    merged.forEach((file) => dt.items.add(file));
    void handleFilesRef.current(dt.files);
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
    const images: ImageBase64Entry[] = files
      .map((f) => f.imageBase64)
      .filter((entry): entry is ImageBase64Entry => Boolean(entry));
    return applyImagesToBase64InContent(content, images);
  };

  const normalizeRelativePath = (item: UploadedFile) =>
    (item.relativePath || item.file.name)
      .replace(/\\+/g, "/")
      .replace(/^\/+/, "");

  const isOfflinePackageImageFile = (item: UploadedFile) => {
    const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
    return IMAGE_EXTS.includes(ext) || item.file.type.startsWith("image/");
  };

  const isOfflinePackageVideoFile = (item: UploadedFile) => {
    const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
    return VIDEO_EXTS.includes(ext) || item.file.type.startsWith("video/");
  };

  /** HTML/JS sources for offline convert + ZIP (excludes images, libs, and other assets). */
  const isOfflinePackageTextFile = (item: UploadedFile) => {
    if (isOfflinePackageImageFile(item) || isOfflinePackageVideoFile(item)) {
      return false;
    }
    const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
    if (!TEXT_EXTS.includes(ext)) return false;
    const rel = normalizeRelativePath(item).replace(/\\/g, "/");
    if (OFFLINE_PACKAGE_SKIP_REL_PATH_RE.test(rel)) return false;
    return true;
  };

  const pickOfflinePackageFiles = (all: UploadedFile[]) => ({
    textFiles: all.filter(isOfflinePackageTextFile),
    videoFiles: all.filter(isOfflinePackageVideoFile),
  });

  /**
   * Offline download: flat zip (no remote SFTP-style paths).
   * Only converted HTML/JS plus video when uploaded â€” images, libs, and other assets are omitted.
   * First HTML becomes `index.html`; basenames uniquified on clashes across text + video.
   */
  const buildOfflineGeneratedFiles = async (
    textFiles: UploadedFile[],
    videoFiles: UploadedFile[],
    fixedVideoDesiredPath?: string,
  ): Promise<OfflineGeneratedFile[]> => {
    const entries: { desiredName: string; blob: Blob }[] = [];
    let indexHtmlUsed = false;

    for (const item of textFiles) {
      if (!isOfflinePackageTextFile(item)) continue;
      const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
      if (!TEXT_EXTS.includes(ext)) continue;

      const rawContent = await item.file.text();
      const convertedContent = replaceImagesToBase64(rawContent);
      const extLower = ext.slice(1);
      const isHtml = extLower === "html" || extLower === "htm";
      const relativePath = normalizeRelativePath(item);
      const leaf =
        relativePath.split("/").filter(Boolean).pop() ?? item.file.name;
      const safeLeaf = leaf.replace(/[<>:"|?*]/g, "_");
      const desiredName = isHtml && !indexHtmlUsed ? "index.html" : safeLeaf;
      if (isHtml && !indexHtmlUsed) indexHtmlUsed = true;

      entries.push({
        desiredName,
        blob: new Blob([convertedContent], {
          type: "text/plain;charset=utf-8",
        }),
      });
    }

    for (const item of videoFiles) {
      if (!isOfflinePackageVideoFile(item)) continue;
      const ext = `.${item.file.name.split(".").pop() ?? ""}`.toLowerCase();
      if (!VIDEO_EXTS.includes(ext)) continue;
      const relativePath = normalizeRelativePath(item);
      const leaf =
        relativePath.split("/").filter(Boolean).pop() ?? item.file.name;
      const safeLeaf = leaf.replace(/[<>:"|?*]/g, "_");
      const desiredName = fixedVideoDesiredPath?.trim() || safeLeaf;
      entries.push({
        desiredName,
        blob: item.file,
      });
    }

    const finalNames = uniquifyZipEntryNames(entries.map((e) => e.desiredName));
    return entries.map((e, i) => ({
      name: finalNames[i]!,
      blob: e.blob,
    }));
  };

  const buildBannerOfflineZipDownloadName = () => {
    const d = new Date();
    const month = getItemLabelById(months, config.mode).padStart(2, "0");
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const oh = String(Math.floor(abs / 60)).padStart(2, "0");
    const om = String(abs % 60).padStart(2, "0");
    const tzPart = sanitizeFilenameSegment(`GMT${sign}${oh}${om}`);
    return `${sanitizeFilenameSegment(`Banner-${month}-${date}-${tzPart}`)}.zip`;
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
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildBannerOfflineZipDownloadName();
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

  const openDemoPreviewAtPath = useCallback(
    async (
      remotePath: string,
      opts?: { instreamVideo?: boolean; formatValue?: string },
    ) => {
      const path = remotePath.trim();
      if (!path) {
        setSendError(
          "Missing demo path â€” check Remote Source URL (e.g. 2026/03/brand/.../384x683).",
        );
        return;
      }
      if (opts?.instreamVideo) {
        const fv = opts.formatValue?.trim();
        if (!fv) {
          setSendError(
            "Creative demo has no preview format (value). Pick a demo with value set (e.g. instream, outstream).",
          );
          return;
        }
      }
      setSendError(null);
      setOpeningDemoVideo(true);
      try {
        await openYomediaDemoPreview({
          remotePath: path,
          serverApiUrl: baseUrl,
          instreamVideo: opts?.instreamVideo === true,
          formatValue: opts?.formatValue?.trim(),
          previewHostTemplate,
        });
      } catch (err) {
        setSendError(
          err instanceof Error
            ? err.message
            : "Could not open demo video preview.",
        );
      } finally {
        setOpeningDemoVideo(false);
      }
    },
    [baseUrl, previewHostTemplate],
  );

  const handleReplaceBase64AndUploadSftp = async () => {
    setSendError(null);
    setOfflineGeneratedFiles([]);
    setOfflinePackagePayload(null);
    setOfflinePackageDialogOpen(false);
    setSftpUploadPopupPayload(null);
    setSftpUploadDialogOpen(false);

    if (files.length === 0) {
      setSendError(
        adminOfflineMode
          ? "Please upload files before converting."
          : "Please upload files before sending to SFTP.",
      );
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
    const offlinePackageFiles = pickOfflinePackageFiles(files);

    if (config.demoFormat === "Video") {
      if (adminOfflineMode) {
        if (offlinePackageFiles.videoFiles.length !== 1) {
          setSendError("Video format: upload exactly one MP4/WebM/MOV file.");
          return;
        }
      } else if (videoFiles.length !== 1 || files.length !== 1) {
        setSendError(
          "Video format: upload exactly one MP4/WebM/MOV file (no other assets).",
        );
        return;
      }
    }

    if (adminOfflineMode) {
      if (
        offlinePackageFiles.textFiles.length === 0 &&
        offlinePackageFiles.videoFiles.length === 0
      ) {
        setSendError("No HTML/JS/video files found to convert.");
        return;
      }
    } else if (textFiles.length === 0 && videoFiles.length === 0) {
      setSendError("No HTML/JS/video files found to upload.");
      return;
    }

    if (adminOfflineMode) {
      setBuildProgressText("Preparing offline package...");
      setPreparingOfflineFiles(true);
      try {
        const generated = await buildOfflineGeneratedFiles(
          offlinePackageFiles.textFiles,
          offlinePackageFiles.videoFiles,
          config.demoFormat === "Video" ? VIDEO_DEMO_FIXED_REL_PATH : undefined,
        );
        setOfflineGeneratedFiles(generated);
        const summaryParts = [
          offlinePackageFiles.textFiles.length > 0 ? "HTML + JS" : null,
          offlinePackageFiles.videoFiles.length > 0
            ? config.demoFormat === "Video"
              ? `video as ${VIDEO_DEMO_FIXED_REL_PATH}`
              : `${offlinePackageFiles.videoFiles.length} video`
            : null,
        ].filter(Boolean);
        setOfflinePackagePayload({
          kind: "success",
          summary: `Converted ${generated.length} file${generated.length === 1 ? "" : "s"} (${summaryParts.join(", ")}).`,
        });
        setOfflinePackageDialogOpen(true);
        void recordActivity({
          user,
          action: "build_demo_offline_package",
          area: "Build Demo",
          description: `Prepared offline ZIP (${generated.length} file(s), admin offline mode)`,
          target: sourceUrl.trim() || "offline",
          metadata: {
            fileCount: generated.length,
            demoFormat: config.demoFormat,
            creativeDemo: selectedDemoOption?.title?.trim() ?? "",
            brand: getItemLabelById(brands, config.model),
            adminOfflineMode: true,
          },
        });
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : "Cannot prepare offline files.",
        );
      } finally {
        setPreparingOfflineFiles(false);
        setBuildProgressText(null);
      }
      return;
    }

    let targetPath = sourceUrl.trim();
    if (!targetPath) {
      setSendError("Missing remote source path.");
      return;
    }
    if (!config.model?.trim()) {
      setSendError("Please select a brand before uploading to SFTP.");
      return;
    }
    if (!isBuildDemoBrandAllowed(config.model, allowedBuildDemoBrands)) {
      setSendError(
        "You do not have permission to build demos for this brand. Contact an administrator.",
      );
      return;
    }
    if (showDemoCategoryPicker && !selectedDemoCategory) {
      setSendError("Please select a Category before choosing a Creative Demo.");
      return;
    }
    if (!selectedDemoId.trim()) {
      setSendError(
        config.demoFormat === "Video"
          ? "Please select a video Creative Demo (fileType VIDEO) before uploading."
          : "Please select a Creative Demo before replacing base64 and uploading to SFTP.",
      );
      return;
    }

    const isVideoPathFormat = config.demoFormat === "Video";
    const nameToken = replacementName.trim()
      ? normalizePathToken(replacementName.trim())
      : isVideoPathFormat
        ? ""
        : getUploadedNameToken();
    if (
      (!isVideoPathFormat && (!nameToken || nameToken.length <= 5)) ||
      (isVideoPathFormat && !!replacementName.trim() && nameToken.length <= 5)
    ) {
      setSendError(
        isVideoPathFormat
          ? "Replacement folder name must be longer than 5 characters."
          : "Demo folder name (final path segment) must be longer than 5 characters â€” enter a new name below or rename the HTML/JS file.",
      );
      return;
    }

    let remoteBase = `/script/demo/${targetPath}`.replace(/\/{2,}/g, "/");

    if (sftpPreviewOnlyReopen && lastSuccessfulSftpUpload) {
      const last = lastSuccessfulSftpUpload;
      setBuildProgressText("Checking existing demo on SFTP...");
      try {
        const checkData = await sftpClient.exists(last.remoteBase, "demo");
        if (isSftpExistingEntry(checkData)) {
          const metaSnapshot = buildSftpUploadMetaSnapshot();
          setLastSuccessfulSftpUpload({
            ...last,
            previewHostTemplate,
            selectedDemoId,
          });
          setSftpUploadPopupPayload({
            kind: "full",
            targetPath: last.targetPath,
            remoteBase: last.remoteBase,
            uploadedCount: last.uploadedCount,
            totalFiles: last.totalFiles,
            videoLogs: last.videoLogs,
            meta: metaSnapshot,
            setup: last.setup,
          });
          const pickedDemo = selectedDemoOption;
          await openDemoPreviewAtPath(last.targetPath, {
            instreamVideo:
              config.demoFormat === "Video" &&
              String(pickedDemo?.category ?? "").trim() === "Video",
            formatValue: pickedDemo?.value?.trim() ?? "",
          });
          void recordActivity({
            user,
            action: "build_demo_preview_reopen",
            area: "Build Demo",
            description:
              "Reopened demo preview (preview template or creative demo changed; SFTP files unchanged)",
            target: last.remoteBase,
            metadata: {
              targetPath: last.targetPath,
              creativeDemo: metaSnapshot.creativeDemo,
              previewHostTemplate,
            },
          });
          return;
        }
      } catch {
        // Fall through to full upload if the remote check fails.
      } finally {
        setBuildProgressText(null);
      }
    }

    const prepareOfflineFallback = async (reason: string) => {
      setBuildProgressText("Preparing fallback ZIP package...");
      setPreparingOfflineFiles(true);
      try {
        const generated = await buildOfflineGeneratedFiles(
          offlinePackageFiles.textFiles,
          offlinePackageFiles.videoFiles,
          config.demoFormat === "Video" ? VIDEO_DEMO_FIXED_REL_PATH : undefined,
        );
        setOfflineGeneratedFiles(generated);
        const issueLine =
          reason
            .split(/\n/)
            .find((ln) => ln.trim())
            ?.trim() ?? reason.trim();
        setOfflinePackagePayload({
          kind: "fallback",
          summary: `${generated.length} converted file(s) bundled for local ZIP download (HTML/JS + video only).`,
          uploadIssueSummary: issueLine.slice(0, 280),
        });
        setOfflinePackageDialogOpen(true);
        setSendError(
          `${reason}\nOffline ZIP is ready â€” use the dialog to download.`,
        );
        void recordActivity({
          user,
          action: "build_demo_sftp_fallback_zip",
          area: "Build Demo",
          description: `SFTP blocked or failed â€” offline ZIP prepared (${generated.length} file(s))`,
          target: remoteBase,
          metadata: {
            reason: issueLine.slice(0, 280),
            fileCount: generated.length,
            demoFormat: config.demoFormat,
            creativeDemo: selectedDemoOption?.title?.trim() ?? "",
            brand: getItemLabelById(brands, config.model),
          },
        });
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

    setBuildProgressText("Checking remote path on SFTP...");
    try {
      if (!canBuildDemoSftpPut) {
        const need: string[] = [];
        if (bdSftp?.canSftpUploadBinary !== true)
          need.push("canSftpUploadBinary");
        if (bdSftp?.canSftpWriteFile !== true) need.push("canSftpWriteFile");
        await prepareOfflineFallback(
          need.length > 0
            ? `SFTP upload requires: ${need.join(", ")} â€” enable in Admin â†’ Permissions.`
            : "SFTP upload is not allowed for your role.",
        );
        return;
      }

      try {
        const checkData = await sftpClient.exists(remoteBase, "demo");
        if (!checkData?.ok) {
          await prepareOfflineFallback(
            checkData?.error ||
              "Cannot verify remote path on SFTP. Check server connection.",
          );
          return;
        }
        if (isSftpExistingEntry(checkData)) {
          if (!replacementName.trim()) {
            if (config.demoFormat === "Video") {
              const baseSeg = getDemoFormatSegment();
              const result = await resolveAvailableRemoteSegment(
                buildRemoteRootSegments(),
                baseSeg,
              );
              if (result.exhausted) {
                setDirectoryExists(true);
                setSendError(
                  "That video folder and all auto-suffixed names are already taken on SFTP. Enter a replacement name above.",
                );
                return;
              }
              setVideoAutoDirSegment(result.segment);
              targetPath = [...buildRemoteRootSegments(), result.segment]
                .filter(Boolean)
                .join("/");
              remoteBase = `/script/demo/${targetPath}`.replace(/\/{2,}/g, "/");
            } else if (autoUploadNameToken.length > 5) {
              const baseSeg = autoUploadNameToken;
              const formatSeg = getDemoFormatSegment();
              const result = await resolveAvailableRemoteSegment(
                buildRemoteBaseSegments(formatSeg),
                baseSeg,
              );
              if (result.exhausted) {
                setDirectoryExists(true);
                setSendError(
                  "That demo folder and all auto-suffixed names are already taken on SFTP. Enter a replacement name above.",
                );
                return;
              }
              setHtmlAutoDirSegment(result.segment);
              targetPath = [
                ...buildRemoteBaseSegments(formatSeg),
                result.segment,
              ]
                .filter(Boolean)
                .join("/");
              remoteBase = `/script/demo/${targetPath}`.replace(/\/{2,}/g, "/");
            } else {
              setSendError(
                "Remote folder already exists on SFTP. Enter a replacement name above, then upload again.",
              );
              return;
            }
          } else {
            setSendError(
              "Target path still exists on SFTP. Choose a different replacement name.",
            );
            return;
          }
        }
      } catch {
        await prepareOfflineFallback(
          "Cannot verify remote path on SFTP (network error).",
        );
        return;
      }

      setBuildProgressText("Building demo and uploading to SFTP...");
      setSendingToSftp(true);
      try {
        // If multiple HTML uploads (.html/.htm), only rename the first to index.html
        // to avoid overwriting others.
        let indexHtmlUploaded = false;
        const sftpErrors: string[] = [];
        const videoCompressionLogs: string[] = [];
        let uploadedCount = 0;
        const isVideoFmt = config.demoFormat === "Video";
        const sftpRemoteLeaf =
          targetPath.split("/").filter(Boolean).pop() ?? "";
        const sftpUploadBaseForStrip =
          config.demoFormat === "Video" ? "" : autoUploadNameToken;

        if (!isVideoFmt) {
          for (const item of textFiles) {
            try {
              const rawContent = await item.file.text();
              const convertedContent = replaceImagesToBase64(rawContent);

              const ext = item.file.name.split(".").pop()?.toLowerCase();
              const isHtml = ext === "html" || ext === "htm";
              const relativePath = stripRedundantRelativeFolderPrefix(
                normalizeRelativePath(item),
                {
                  remoteLeaf: sftpRemoteLeaf,
                  uploadBaseToken: sftpUploadBaseForStrip,
                },
              );
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

              const data = await sftpClient.write({
                path: remoteFilePath,
                content: convertedContent,
              });
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
        }

        for (const item of videoFiles) {
          try {
            const remoteFilePath = (
              isVideoFmt
                ? `${remoteBase}/${VIDEO_DEMO_FIXED_REL_PATH}`
                : `${remoteBase}/${stripRedundantRelativeFolderPrefix(
                    normalizeRelativePath(item),
                    {
                      remoteLeaf: sftpRemoteLeaf,
                      uploadBaseToken: sftpUploadBaseForStrip,
                    },
                  )}`
            ).replace(/\/{2,}/g, "/");
            const data = await sftpClient.writeBinary(
              remoteFilePath,
              await item.file.arrayBuffer(),
            );
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

        if (isVideoFmt) {
          const xmlLeaf = "make-vast.xml";
          const xmlRemotePath = `${remoteBase}/${xmlLeaf}`.replace(
            /\/{2,}/g,
            "/",
          );
          const xmlBody = buildVideoMakeVastXml(targetPath);
          try {
            const data = await sftpClient.write({
              path: xmlRemotePath,
              content: xmlBody,
            });
            if (!data?.ok) {
              sftpErrors.push(
                `${xmlLeaf}: ${data?.error || "XML upload failed"}`,
              );
            } else {
              uploadedCount++;
            }
          } catch (err) {
            sftpErrors.push(
              `${xmlLeaf}: ${
                err instanceof Error ? err.message : "XML upload failed"
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
          const metaSnapshot = buildSftpUploadMetaSnapshot();
          const totalFiles = isVideoFmt
            ? videoFiles.length + 1
            : textFiles.length + videoFiles.length;
          if (sftpErrors.length > 0) {
            setSftpUploadPopupPayload({
              kind: "partial",
              targetPath,
              remoteBase,
              uploadedCount,
              totalFiles,
              videoLogs: videoCompressionLogs,
              failureDetails: sftpErrors.join("\n"),
              meta: metaSnapshot,
            });
            setSftpUploadDialogOpen(true);
            void recordActivity({
              user,
              action: "upload_demo_partial",
              area: "Build Demo",
              description: `Uploaded ${uploadedCount} of ${totalFiles} demo file(s) to SFTP`,
              target: remoteBase,
              metadata: {
                uploadKind: "partial",
                targetPath,
                remoteBase,
                uploadedCount,
                totalFiles,
                creativeDemo: metaSnapshot.creativeDemo,
                brand: metaSnapshot.brand,
              },
            });
          } else {
            setSftpUploadPopupPayload({
              kind: "full",
              targetPath,
              remoteBase,
              uploadedCount: totalFiles,
              totalFiles,
              videoLogs: videoCompressionLogs,
              meta: metaSnapshot,
            });
            setLastSuccessfulSftpUpload({
              targetPath,
              remoteBase,
              uploadFingerprint: currentSftpUploadFingerprint,
              previewHostTemplate,
              selectedDemoId,
              uploadedCount: totalFiles,
              totalFiles,
              videoLogs: videoCompressionLogs,
            });
            setSftpUploadDialogOpen(true);
            setOfflineGeneratedFiles([]);
            setOfflinePackagePayload(null);
            setOfflinePackageDialogOpen(false);
            void recordActivity({
              user,
              action: "upload_demo_success",
              area: "Build Demo",
              description: `Uploaded ${totalFiles} demo file(s) to SFTP`,
              target: remoteBase,
              metadata: {
                uploadKind: "full",
                targetPath,
                remoteBase,
                totalFiles,
                creativeDemo: metaSnapshot.creativeDemo,
                brand: metaSnapshot.brand,
              },
            });
          }
        }
      } catch (err) {
        await prepareOfflineFallback(
          err instanceof Error ? err.message : "Upload to SFTP failed.",
        );
      } finally {
        setSendingToSftp(false);
      }
    } finally {
      setBuildProgressText(null);
    }
  };

  const handleSetupMediaFromLatestUpload = async () => {
    const currentPayload = sftpUploadPopupPayload;
    if (!currentPayload) return;

    const setupPath = String(currentPayload.remoteBase ?? "").trim();
    if (!setupPath) {
      setSftpUploadPopupPayload((prev) =>
        prev
          ? {
              ...prev,
              setup: {
                status: "error",
                error: "Missing uploaded SFTP path for setup.",
              },
            }
          : prev,
      );
      return;
    }

    if (currentPayload.kind !== "full") {
      setSftpUploadPopupPayload((prev) =>
        prev
          ? {
              ...prev,
              setup: {
                status: "error",
                error:
                  "Setup is available only after all files upload successfully.",
              },
            }
          : prev,
      );
      return;
    }

    if (!canBuildDemoMediaSetup) {
      setSftpUploadPopupPayload((prev) =>
        prev
          ? {
              ...prev,
              setup: {
                status: "error",
                error:
                  "Setup to media SFTP requires canSetupMediaSftp permission.",
              },
            }
          : prev,
      );
      return;
    }

    setBuildProgressText("Setting up converted files on media SFTP...");
    setSettingUpMedia(true);
    setSftpUploadPopupPayload((prev) =>
      prev
        ? {
            ...prev,
            setup: {
              status: "idle",
            },
          }
        : prev,
    );

    try {
      const data = await sftpClient.setupDemoToMedia(setupPath);
      if (!data?.ok) {
        throw new Error(data?.error || "Cannot set up files on media SFTP.");
      }

      const setupResult: SftpMediaSetupResult = {
        status: "success",
        mediaRemotePath: formatMediaSetupPath(data.targetPath),
        copiedFiles: Number(data.copiedFiles ?? 0),
        copiedDirectories: Number(data.copiedDirectories ?? 0),
      };
      setSftpUploadPopupPayload((prev) =>
        prev
          ? {
              ...prev,
              setup: setupResult,
            }
          : prev,
      );
      setLastSuccessfulSftpUpload((prev) =>
        prev && prev.remoteBase === setupPath
          ? { ...prev, setup: setupResult }
          : prev,
      );
      void recordActivity({
        user,
        action: "setup_media_sftp",
        area: "Build Demo",
        description: "Set up converted files on media SFTP",
        target: formatMediaSetupPath(data.targetPath),
        metadata: {
          sourcePath: setupPath,
          copiedFiles: Number(data.copiedFiles ?? 0),
          copiedDirectories: Number(data.copiedDirectories ?? 0),
        },
      });
    } catch (err) {
      setSftpUploadPopupPayload((prev) =>
        prev
          ? {
              ...prev,
              setup: {
                status: "error",
                error:
                  err instanceof Error
                    ? err.message
                    : "Cannot set up files on media SFTP.",
              },
            }
          : prev,
      );
    } finally {
      setSettingUpMedia(false);
      setBuildProgressText(null);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 md:p-8 shadow-sm dark:border-white/10 dark:bg-gradient-to-br dark:from-[#1f2a40]/85 dark:via-[#141b2d]/95 dark:to-[#0f172a] dark:shadow-[0_16px_50px_rgba(15,23,42,0.45)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-16 h-52 w-52 rounded-full bg-[#4cceac]/20 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Build Demo
            </h1>
          </div>
          <p className="ml-4 font-medium uppercase tracking-widest text-[9px] text-slate-500 dark:text-[#a3a3a3]">
            Neural Asset Ingestion & Creative Pipeline
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-[#9ca3af]">
                GPU Usage
              </p>
              <p className="mt-1 text-lg font-black text-[#4cceac]">
                {Math.round(metrics.gpu)}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-[#9ca3af]">
                RAM
              </p>
              <p className="mt-1 text-lg font-black text-cyan-600 dark:text-cyan-300">
                {metrics.ram.toFixed(1)} GB
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-[#9ca3af]">
                Latency
              </p>
              <p className="mt-1 text-lg font-black text-violet-600 dark:text-violet-300">
                {Math.round(metrics.latency)} ms
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-[#9ca3af]">
                Health
              </p>
              <p
                className={`mt-1 text-lg font-black ${
                  metrics.health === "Warning"
                    ? "text-amber-600 dark:text-amber-300"
                    : "text-emerald-600 dark:text-emerald-300"
                }`}
              >
                {metrics.health}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-[#4cceac]/50 via-slate-300 to-transparent dark:via-[#3d465d]" />
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Dropzone Area */}
        <div className="xl:col-span-2">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: 40, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 40, y: -10 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="fixed top-24 right-6 z-[110] w-[min(420px,calc(100vw-2rem))]"
              >
                <div
                  className={
                    error.type === "partial"
                      ? "bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl shadow-2xl shadow-amber-500/10 dark:bg-[#1f2a40]/90"
                      : "bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 flex items-start gap-4 backdrop-blur-xl shadow-2xl shadow-rose-500/10 dark:bg-[#1f2a40]/90"
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
                    <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      {error.type === "partial"
                        ? "Partial ingest"
                        : `${error.type} Error Detected`}
                    </h4>
                    <p
                      className={
                        error.type === "partial"
                          ? "text-xs font-medium leading-relaxed text-amber-900/85 whitespace-pre-wrap dark:text-amber-100/80"
                          : "text-xs font-medium leading-relaxed text-rose-900/85 whitespace-pre-wrap dark:text-rose-200/70"
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
            className={`relative flex h-[340px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.2rem] border border-dashed p-8 text-center transition-all duration-500 group shadow-md dark:shadow-[0_22px_65px_rgba(2,6,23,0.45)] ${
              isDragging
                ? "scale-[1.01] border-[#4cceac] bg-[#4cceac]/10 shadow-[0_0_50px_rgba(76,206,172,0.12)] dark:bg-[#4cceac]/5 dark:shadow-[0_0_50px_rgba(76,206,172,0.1)]"
                : "border-slate-300/90 bg-gradient-to-br from-white via-slate-50 to-slate-100 hover:border-[#4cceac]/50 hover:bg-slate-50 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#1f2a40]/55 dark:via-[#141b2d]/70 dark:to-[#0f172a]/90 dark:hover:border-[#4cceac]/40 dark:hover:bg-[#1f2a40]/40"
            }`}
          >
            {/* Avoid full-cover + pointer-events: multi-file drops on <input> only keep one file in Chrome/Edge */}
            <input
              ref={fileInputRef}
              type="file"
              multiple={config.demoFormat !== "Video"}
              accept={
                config.demoFormat === "Video"
                  ? ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                  : ".png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.html,.htm,.js,.mjs"
              }
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                void handleFilesRef.current(e.target.files);
                e.target.value = "";
              }}
            />
            {config.demoFormat !== "Video" ? (
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
                  void handleFilesRef.current(e.target.files);
                  e.target.value = "";
                }}
              />
            ) : null}

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
              className={`relative mb-5 flex h-20 w-20 items-center justify-center rounded-[1.3rem] shadow-lg transition-all duration-500 dark:shadow-2xl ${
                isDragging
                  ? "bg-[#4cceac] text-[#141b2d]"
                  : "bg-slate-800 text-[#4cceac] dark:bg-[#141b2d]"
              }`}
            >
              <CloudArrowUpIcon className="w-10 h-10" />
              {!isDragging && (
                <div className="absolute inset-0 rounded-[1.3rem] border border-[#4cceac]/20 animate-ping" />
              )}
            </motion.div>

            <h3 className="mb-2 text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
              {isDragging ? "Release to Ingest" : "Drop Assets Here"}
            </h3>
            <p className="mx-auto max-w-sm text-[11px] font-medium leading-relaxed tracking-wide text-slate-700 dark:text-[#a3a3a3]">
              <span className="font-semibold text-slate-800 dark:font-medium dark:text-inherit">
                INTELLIGENT UPLOAD SYSTEM v2.0
              </span>
              <br />
              <span className="mt-1 block text-slate-600 dark:text-inherit dark:opacity-60">
                {config.demoFormat === "Video"
                  ? "Upload one demo video â€” brand, VIDEO creative demo, then upload to SFTP."
                  : "Drag and drop files or a whole folder (images + HTML/JS)"}
              </span>
              <span className="mt-1 block text-slate-500 dark:text-inherit dark:opacity-60">
                {config.demoFormat === "Video"
                  ? "MP4 â€¢ WEBM â€¢ MOV â€¢ MAX 500MB â€” server targets â‰¤4 MB when larger"
                  : "PNG â€¢ JPG â€¢ WEBP â€¢ GIF â€¢ SVG â€¢ HTML â€¢ JS â€¢ MAX 10MB"}
              </span>
            </p>
            <div
              className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {config.demoFormat !== "Video" ? (
                <Button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-teal-600/35 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-teal-800 shadow-sm transition-colors hover:border-[#4cceac]/60 hover:bg-teal-50 dark:border-[#4cceac]/35 dark:bg-[#141b2d]/80 dark:text-[#4cceac] dark:shadow-none dark:hover:bg-[#4cceac]/10"
                >
                  <FolderOpenIcon className="h-4 w-4" />
                  Choose folder
                </Button>
              ) : null}
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(76,206,172,0.05)_0%,transparent_70%)]" />
              <div className="absolute top-10 left-10 w-40 h-40 bg-[#4cceac] rounded-full blur-[100px] opacity-20" />
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-indigo-500 rounded-full blur-[100px] opacity-20" />
            </div>
          </motion.div>
          <div className="mt-8 space-y-3">
            <div className="ml-1 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-white/20" />
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                Remote Source URL (Optional)
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="group relative flex-1">
                <input
                  type="text"
                  value={sourceUrl}
                  readOnly
                  placeholder="2026/03/bbhh/all/video/demo-folder-name"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-5 px-6 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl dark:placeholder-white/10"
                />
              </div>
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
                  setVideoAutoDirSegment(
                    normalizePathToken(config.demoFormat.toLowerCase()),
                  );
                  setOfflineGeneratedFiles([]);
                  setOfflinePackagePayload(null);
                  setOfflinePackageDialogOpen(false);
                  setSftpUploadDialogOpen(false);
                }}
                disabled={files.length === 0 && !sourceUrl}
                className="flex min-h-[64px] min-w-[120px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-4 text-[10px] font-black uppercase italic tracking-widest text-slate-800 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:bg-white/10"
              >
                Reset
              </Button>
            </div>
          </div>
          {showUploadNameInput && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${directoryExists ? "bg-amber-400" : "bg-[#4cceac]"}`}
                />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                  {directoryExists
                    ? "Directory Exists â€” Replacement Name"
                    : htmlAutoRenamed
                      ? "Auto-renamed demo folder (optional override)"
                      : config.demoFormat === "Video"
                        ? "Override demo folder name (optional)"
                        : "Name the demo folder (required)"}
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={replacementName}
                  onChange={(e) => setReplacementName(e.target.value)}
                  minLength={6}
                  placeholder="At least 6 characters (e.g. banner-spring-2026)"
                  className={`w-full rounded-2xl border bg-white py-4 px-5 text-sm font-medium text-slate-900 outline-none shadow-sm transition-all placeholder:text-slate-400 focus:border-[#4cceac]/60 dark:bg-[#141b2d] dark:text-white dark:shadow-xl dark:placeholder-white/20 ${
                    directoryExists
                      ? "border-amber-400/50 focus:border-amber-500 dark:border-amber-400/30 dark:focus:border-amber-300"
                      : "border-slate-200 dark:border-[#4cceac]/30"
                  }`}
                />
              </div>
              <p
                className={`text-[11px] ${directoryExists ? "text-amber-800 dark:text-amber-300/80" : "text-teal-800 dark:text-[#4cceac]/80"}`}
              >
                {directoryExists
                  ? "Path already exists on SFTP â€” enter a new name (longer than 5 characters) to avoid overwriting."
                  : config.demoFormat === "Video"
                    ? "Video: the remote folder is `â€¦/video`; if that path exists, the app uses `video-1`, `video-2`, â€¦ automatically. Add an optional subfolder name below only when you want `â€¦/video/your-name`."
                    : htmlAutoRenamed
                      ? `HTML: folder \`${autoUploadNameToken}\` already exists, so the app will upload to \`${htmlAutoDirSegment}\` automatically.`
                      : "Name from HTML/JS is â‰¤ 5 characters â€” enter a demo folder name of at least 6 characters."}
                {checkingDirectory ? " Checking..." : ""}
                {!uploadNameValid && replacementName.trim().length > 0 ? (
                  <span className="mt-1 block text-rose-700 dark:text-rose-300/90">
                    Still short: needs more than 5 characters (currently{" "}
                    {normalizePathToken(replacementName.trim()).length}).
                  </span>
                ) : null}
              </p>
            </div>
          )}
          {/* Configuration Section */}
          <div className="mt-8 rounded-[1.6rem] border border-slate-200/90 bg-white p-4 shadow-md md:p-5 dark:border-white/10 dark:bg-gradient-to-b dark:from-[#141b2d]/85 dark:to-[#0f172a]/95 dark:shadow-[0_16px_45px_rgba(2,6,23,0.38)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Demo Metadata
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-600 dark:text-[#94a3b8]">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Demo format
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.demoFormat}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        demoFormat: e.target
                          .value as (typeof demoFormats)[number],
                      })
                    }
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
                  >
                    {demoFormats.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {showDemoCategoryPicker && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                      Category
                    </label>
                  </div>
                  <div className="relative group">
                    <select
                      value={selectedDemoCategory}
                      onChange={(e) => setSelectedDemoCategory(e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
                    >
                      <option value="">
                        {matchedDemoCategories.length > 0
                          ? "Select category..."
                          : "No matched category"}
                      </option>
                      {matchedDemoCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Preview template
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={previewHostTemplate}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "eva" || v === "tuoitre" || v === "default") {
                        setPreviewHostTemplate(v);
                      }
                    }}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
                  >
                    <option value="default">Default</option>
                    <option value="eva">Eva</option>
                    <option value="tuoitre">Tuoi tre</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Creative Demo
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={selectedDemoId}
                    onChange={(e) => setSelectedDemoId(e.target.value)}
                    disabled={showDemoCategoryPicker && !selectedDemoCategory}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl dark:disabled:bg-[#111827] dark:disabled:text-[#6b7280]"
                  >
                    <option value="">{creativeDemoPlaceholder}</option>
                    {categoryScopedDemoTitleOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
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
                    className={`w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold shadow-sm outline-none transition-all focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:shadow-xl ${
                      config.model
                        ? getBrandColorClass(config.model)
                        : "text-slate-900 dark:text-white"
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
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Product Category
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.productCate}
                    onChange={(e) =>
                      setConfig({ ...config, productCate: e.target.value })
                    }
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#4cceac]/50 dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
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
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Year
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.quality}
                    disabled
                    className="w-full cursor-default appearance-none rounded-xl border border-slate-200 bg-slate-100 py-3 px-4 text-xs font-bold text-slate-700 outline-none dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
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
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-[#a3a3a3]">
                    Month
                  </label>
                </div>
                <div className="relative group">
                  <select
                    value={config.mode}
                    disabled
                    className="w-full cursor-default appearance-none rounded-xl border border-slate-200 bg-slate-100 py-3 px-4 text-xs font-bold text-slate-700 outline-none dark:border-white/5 dark:bg-[#141b2d] dark:text-white dark:shadow-xl"
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
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[2rem] border border-slate-200/90 bg-slate-50/90 p-4 shadow-md md:p-5 dark:border-white/10 dark:bg-[#0f172a]/80 dark:shadow-[0_18px_50px_rgba(2,6,23,0.45)]">
            <Button
              type="button"
              onClick={handleReplaceBase64AndUploadSftp}
              disabled={
                adminOfflineMode
                  ? files.length === 0 ||
                    preparingOfflineFiles ||
                    sendingToSftp ||
                    buildBusy
                  : config.demoFormat === "Video"
                    ? !selectedDemoId.trim() ||
                      !config.model?.trim() ||
                      !uploadNameValid ||
                      !sourceUrl.trim() ||
                      files.length !== 1 ||
                      !isUploadedVideoFile(files[0]!) ||
                      buildBusy ||
                      sendingToSftp ||
                      checkingDirectory ||
                      (directoryExists && !replacementName.trim())
                    : (showDemoCategoryPicker && !selectedDemoCategory) ||
                      !selectedDemoId.trim() ||
                      !config.model?.trim() ||
                      !uploadNameValid ||
                      !sourceUrl.trim() ||
                      files.length === 0 ||
                      buildBusy ||
                      sendingToSftp ||
                      checkingDirectory ||
                      (showUploadNameInput &&
                        !replacementName.trim() &&
                        !htmlAutoRenamed)
              }
              className="px-8 py-4 min-w-[120px] rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-[#3d465d] disabled:to-[#3d465d] disabled:opacity-60 text-white font-black border border-white/10 shadow-[0_8px_24px_rgba(139,92,246,0.25)] transition-all uppercase tracking-widest text-[10px] italic flex items-center justify-center gap-2"
            >
              {adminOfflineMode
                ? buildBusy || preparingOfflineFiles
                  ? "Converting..."
                  : "Convert"
                : buildBusy || sendingToSftp
                  ? "Building..."
                  : sftpPreviewOnlyReopen
                    ? "Open new preview"
                    : "Convert and Upload"}
            </Button>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
              {sftpUploadPopupPayload && !sftpUploadDialogOpen && (
                <Button
                  type="button"
                  onClick={() => setSftpUploadDialogOpen(true)}
                  className="flex min-w-[120px] items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-800 transition-all hover:bg-emerald-500/25 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                >
                  Open upload result
                </Button>
              )}
            </div>
          </div>
          {sendError && (
            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              {sendError}
            </p>
          )}
          {offlinePackagePayload &&
            offlineGeneratedFiles.length > 0 &&
            !offlinePackageDialogOpen && (
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => setOfflinePackageDialogOpen(true)}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-500/25 dark:border-amber-300/30 dark:text-amber-200 dark:hover:bg-amber-500/25"
                >
                  Open offline ZIP dialog
                </Button>
              </div>
            )}
          {preparingOfflineFiles && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
              Preparing offline package...
            </p>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[3rem] border border-slate-200/90 bg-gradient-to-b from-white via-slate-50 to-slate-100 p-8 shadow-lg dark:border-white/10 dark:from-[#141b2d]/95 dark:to-[#0b1220] dark:shadow-[0_24px_70px_rgba(2,6,23,0.55)]">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[#4cceac]/35 to-transparent dark:via-[#4cceac]/20" />

          <div className="mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                Asset Review
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#a3a3a3]">
                  Staging Environment
                </span>
                <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-2 py-0.5 shadow-inner dark:border-white/5 dark:bg-white/5">
                  <Button
                    onClick={() => setFilterType("all")}
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest transition-all ${filterType === "all" ? "bg-[#4cceac] text-[#141b2d]" : "text-slate-500 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:text-white"}`}
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => setFilterType("recent")}
                    className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest transition-all ${filterType === "recent" ? "bg-[#4cceac] text-[#141b2d]" : "text-slate-500 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:text-white"}`}
                  >
                    Recent
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-full border border-[#4cceac]/30 bg-[#4cceac]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-teal-800 dark:border-[#4cceac]/20 dark:text-[#4cceac]">
              {files.length} Units
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            <AnimatePresence initial={false}>
              {files.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-[#3d465d]"
                >
                  <PhotoIcon className="mb-4 h-16 w-16 text-slate-400 opacity-50 dark:text-inherit dark:opacity-20" />
                  <p className="text-sm font-medium text-slate-600 dark:text-inherit">
                    No assets uploaded yet
                  </p>
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
                      className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-[#4cceac]/45 dark:bg-[#141b2d] dark:border-[#3d465d] dark:hover:border-[#4cceac]/30"
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
                        className="flex h-16 w-16 shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md transition-all duration-500 hover:scale-110 dark:border-white/10 dark:bg-[#1f2a40]"
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
                        <p className="truncate pr-6 text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                          {file.file.name}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-[#4cceac]" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-[#a3a3a3]">
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
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-slate-900/55 p-10 backdrop-blur-xl dark:bg-[#141b2d]/90"
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
                className="max-h-[80vh] max-w-full rounded-3xl border border-slate-200 object-contain shadow-2xl dark:border-white/10"
              />
              <Button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:text-[#4cceac] dark:text-[#e0e0e0]"
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
            <div className="mx-auto max-w-5xl space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#020617] dark:shadow-[0_20px_60px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-[#a3a3a3]">
                    {selectedTextFile.mode === "edit"
                      ? "Edit file"
                      : "View file"}
                  </span>
                  <span className="max-w-[360px] truncate text-xs text-slate-800 dark:text-[#e5e7eb]">
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
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-800 hover:bg-slate-100 dark:border-transparent dark:bg-white/5 dark:text-[#e5e7eb] dark:hover:bg-white/10"
                  >
                    {selectedTextFile.mode === "edit" ? "View only" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedTextFile(null)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-800 hover:bg-slate-100 dark:border-transparent dark:bg-white/5 dark:text-[#e5e7eb] dark:hover:bg-white/10"
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
                className="min-h-[220px] w-full resize-vertical rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800 outline-none focus:border-[#4cceac]/60 dark:border-[#1f2937] dark:bg-[#020617] dark:text-[#e5e7eb]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {buildBusy ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0f172a]/95 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.65)]"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/10">
                <ArrowPathIcon
                  className="h-8 w-8 animate-spin text-violet-200"
                  aria-hidden
                />
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-violet-200/80">
                Build Demo
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                Please wait
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {buildProgressText}
              </p>
              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#4cceac] via-violet-400 to-fuchsia-400"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 1.1,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <NoticePopup
        open={offlinePackageDialogOpen && offlinePackagePayload !== null}
        onClose={() => setOfflinePackageDialogOpen(false)}
        title={
          offlinePackagePayload?.kind === "fallback"
            ? "Offline ZIP ready"
            : "Offline package ready"
        }
        variant={
          offlinePackagePayload?.kind === "fallback" ? "warning" : "success"
        }
        confirmLabel="Close"
      >
        {offlinePackagePayload ? (
          <div className="space-y-4 text-left">
            {offlinePackagePayload.uploadIssueSummary ? (
              <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-amber-100">
                {offlinePackagePayload.uploadIssueSummary}
              </p>
            ) : null}
            <p className="text-sm text-[#cbd5e1]">
              {offlinePackagePayload.summary}
            </p>
            <ul className="space-y-2 border-t border-white/[0.06] pt-4 text-xs text-[#94a3b8]">
              <li className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4cceac]"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-white/90">
                    {offlineGeneratedFiles.length} file(s)
                  </span>{" "}
                  in the ZIP (flat folder; no SFTP path).
                </span>
              </li>
              <li className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4cceac]"
                  aria-hidden
                />
                <span>
                  ZIP contains converted HTML/JS only, plus video when uploaded
                  (images and other assets are not included). File name:{" "}
                  <span className="font-semibold text-white/90">
                    Banner + month + date + timezone
                  </span>
                  .
                </span>
              </li>
            </ul>
            <Button
              type="button"
              onClick={() => void downloadOfflineGeneratedFiles()}
              disabled={
                offlineGeneratedFiles.length === 0 || downloadingOfflineZip
              }
              className="w-full rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-amber-100 ring-1 ring-amber-400/20 transition hover:bg-amber-500/30 disabled:opacity-50"
            >
              {downloadingOfflineZip
                ? "Creating ZIP..."
                : `Download ZIP (${offlineGeneratedFiles.length})`}
            </Button>
          </div>
        ) : null}
      </NoticePopup>

      <NoticePopup
        open={sftpUploadDialogOpen && sftpUploadPopupPayload !== null}
        onClose={() => setSftpUploadDialogOpen(false)}
        title={
          sftpUploadPopupPayload?.kind === "partial"
            ? "Upload partially failed"
            : "Uploaded to SFTP"
        }
        variant={
          sftpUploadPopupPayload?.kind === "partial" ? "warning" : "success"
        }
        confirmLabel="Close"
      >
        {sftpUploadPopupPayload ? (
          <div className="space-y-4 text-left">
            <p className="text-xs leading-relaxed text-[#94a3b8]">
              Remote path starts with Year, Month, Brand, and Product Category,
              then Demo format (html or video), plus the demo folder name (from
              your HTML/JS or replacement name). Values below are what was used
              for this upload.
            </p>
            <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs text-[#cbd5e1]">
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Demo format
              </dt>
              <dd className="font-semibold text-white/95">
                {sftpUploadPopupPayload.meta.demoFormat}
              </dd>
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Demo
              </dt>
              <dd className="font-semibold text-white/95">
                {sftpUploadPopupPayload.meta.creativeDemo}
              </dd>
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Brand
              </dt>
              <dd className="font-semibold text-white/95">
                {sftpUploadPopupPayload.meta.brand}
              </dd>
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Category
              </dt>
              <dd className="font-semibold text-white/95">
                {sftpUploadPopupPayload.meta.productCate}
              </dd>
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Year
              </dt>
              <dd>{sftpUploadPopupPayload.meta.year}</dd>
              <dt className="font-black uppercase tracking-wider text-[#64748b]">
                Month
              </dt>
              <dd>{sftpUploadPopupPayload.meta.month}</dd>
            </dl>
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[#64748b]">
                Remote path
              </p>
              <div className="break-all rounded-xl border border-cyan-500/25 bg-black/35 px-3 py-2.5 font-mono text-[11px] leading-snug text-cyan-100/95">
                {sftpUploadPopupPayload.remoteBase.replace(
                  /^\/script\/demo\/?/i,
                  "",
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-[#64748b]">
                Relative:{" "}
                <span className="font-mono text-[#94a3b8]">
                  {sftpUploadPopupPayload.targetPath}
                </span>
              </p>
            </div>
            <p className="text-sm text-[#cbd5e1]">
              {sftpUploadPopupPayload.kind === "full"
                ? `All ${sftpUploadPopupPayload.totalFiles} file(s) uploaded. Images inlined as base64 in HTML/JS; videos sent as uploads.`
                : `Uploaded ${sftpUploadPopupPayload.uploadedCount} of ${sftpUploadPopupPayload.totalFiles} file(s). Base64 applied where the file succeeded.`}
            </p>
            {canBuildDemoMediaSetup || sftpUploadPopupPayload.setup ? (
              <div className="border-t border-white/[0.06] pt-4 space-y-3">
                {canBuildDemoMediaSetup ? (
                  <>
                    <p className="text-[11px] leading-relaxed text-[#94a3b8]">
                      After confirming this converted upload is correct, click{" "}
                      <span className="font-semibold text-white/90">Setup</span>{" "}
                      to copy the same folder from SFTP demo to SFTP media.
                    </p>
                    <Button
                      type="button"
                      onClick={() => void handleSetupMediaFromLatestUpload()}
                      disabled={
                        settingUpMedia ||
                        sftpUploadPopupPayload.kind !== "full" ||
                        !String(
                          sftpUploadPopupPayload.remoteBase ?? "",
                        ).trim() ||
                        sftpUploadPopupPayload.setup?.status === "success"
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/20 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-cyan-100 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/30 disabled:opacity-45"
                    >
                      <FolderOpenIcon
                        className="h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      {settingUpMedia
                        ? "Setting up..."
                        : sftpUploadPopupPayload.setup?.status === "success"
                          ? "Setup completed"
                          : "Setup to media"}
                    </Button>
                    {sftpUploadPopupPayload.kind !== "full" ? (
                      <p className="text-[11px] leading-relaxed text-amber-200/90">
                        Complete the upload first, then run setup to media.
                      </p>
                    ) : null}
                  </>
                ) : null}
                {sftpUploadPopupPayload.setup?.status === "success" ? (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-100">
                    <p className="font-semibold text-emerald-50">
                      Media setup completed.
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Copied {sftpUploadPopupPayload.setup.copiedFiles ?? 0}{" "}
                      file(s)
                      {` `}
                      and created{" "}
                      {sftpUploadPopupPayload.setup.copiedDirectories ?? 0}{" "}
                      folder(s) on media SFTP.
                    </p>
                    {sftpUploadPopupPayload.setup.mediaRemotePath ? (
                      <div className="mt-2 break-all rounded-lg bg-black/25 px-3 py-2 font-mono text-[11px] text-emerald-50/95">
                        {sftpUploadPopupPayload.setup.mediaRemotePath}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {sftpUploadPopupPayload.setup?.status === "error" &&
                sftpUploadPopupPayload.setup.error ? (
                  <div className="rounded-xl border border-rose-500/25 bg-rose-950/35 px-3 py-3 text-xs leading-relaxed text-rose-100">
                    {sftpUploadPopupPayload.setup.error}
                  </div>
                ) : null}
              </div>
            ) : null}
            {sftpUploadPopupPayload.videoLogs.length > 0 ? (
              <div className="border-t border-white/[0.06] pt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#64748b]">
                  Video processing
                </p>
                <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-[#cbd5e1]">
                  {sftpUploadPopupPayload.videoLogs.join("\n")}
                </pre>
              </div>
            ) : null}
            {sftpUploadPopupPayload.failureDetails ? (
              <div className="border-t border-white/[0.06] pt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-rose-300/90">
                  Failed
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-rose-500/25 bg-rose-950/35 p-3 text-xs leading-relaxed text-rose-100">
                  {sftpUploadPopupPayload.failureDetails}
                </pre>
              </div>
            ) : null}
            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <p className="text-[11px] leading-relaxed text-[#94a3b8]">
                Open the creative demo preview when you want â€” optional (uses
                the relative path above).
              </p>
              <Button
                type="button"
                onClick={() =>
                  void openDemoPreviewAtPath(
                    sftpUploadPopupPayload.targetPath,
                    {
                      instreamVideo:
                        sftpUploadPopupPayload.meta.demoFormat === "Video" &&
                        sftpUploadPopupPayload.meta.demoCategory === "Video",
                      formatValue: sftpUploadPopupPayload.meta.demoValue,
                    },
                  )
                }
                disabled={
                  openingDemoVideo ||
                  !String(sftpUploadPopupPayload.targetPath ?? "").trim() ||
                  (sftpUploadPopupPayload.meta.demoFormat === "Video" &&
                    !String(sftpUploadPopupPayload.meta.demoValue ?? "").trim())
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/20 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-100 ring-1 ring-emerald-400/20 transition hover:bg-emerald-500/30 disabled:opacity-45"
              >
                <VideoCameraIcon className="h-4 w-4 shrink-0" aria-hidden />
                {openingDemoVideo ? "Opening..." : "Open demo preview"}
              </Button>
            </div>
          </div>
        ) : null}
      </NoticePopup>

      <NoticePopup
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        title="Supported formats"
        variant="info"
      >
        <ul className="space-y-3">
          <li className="flex gap-3 text-left">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4cceac] shadow-[0_0_10px_rgba(76,206,172,0.5)]"
              aria-hidden
            />
            <span>
              <span className="font-bold text-white">Images:</span> PNG, JPG,
              JPEG, WEBP, GIF, SVG â€” max 10MB
            </span>
          </li>
          <li className="flex gap-3 text-left">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4cceac] shadow-[0_0_10px_rgba(76,206,172,0.5)]"
              aria-hidden
            />
            <span>
              <span className="font-bold text-white">Video:</span> MP4, WEBM,
              MOV â€” max 500MB
            </span>
          </li>
          <li className="flex gap-3 text-left">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4cceac] shadow-[0_0_10px_rgba(76,206,172,0.5)]"
              aria-hidden
            />
            <span>
              <span className="font-bold text-white">HTML:</span> .html, .htm
            </span>
          </li>
          <li className="flex gap-3 text-left">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#4cceac] shadow-[0_0_10px_rgba(76,206,172,0.5)]"
              aria-hidden
            />
            <span>
              <span className="font-bold text-white">JS:</span> .js, .mjs
            </span>
          </li>
        </ul>
      </NoticePopup>
    </div>
  );
};

export default BuildDemo;
