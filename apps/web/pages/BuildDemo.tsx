import React, { useState, useCallback, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import demoConfig from "../data/demoConfig.json";
import brandColors from "../data/brandColors.json";
import { openYomediaDemoPreview } from "../components/OpenDemo";

interface ErrorState {
  message: string;
  type: "validation" | "processing" | "system";
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
  preview: string;
  status: "uploading" | "success" | "error";
  timestamp: number;
  /** Ảnh: lưu kèm tên file và base64 chung state */
  imageBase64?: ImageBase64Entry;
}

const BuildDemo: React.FC = () => {
  const brands = (demoConfig as any).ListBrands ?? [];
  const years = (demoConfig as any).ListYears ?? [];
  const months = (demoConfig as any).ListMonth ?? [];
  const productCates = (demoConfig as any).ListProductCate ?? [];
  const maxkleenProductCateIds = [
    "softergent",
    "thematic",
    "colourcare",
    "podrange",
    "floorcleaner",
    "lingeriewash",
  ];
  const enchantuerProductCateIds = [
    "shower",
    "naturalle-shower",
    "naturalle-serum",
    "scrub",
    "deodorants",
    "shampoo",
  ];
  const getProductCateOptionsByBrand = (brandId: string) => {
    if (brandId?.toLowerCase() === "maxkleen") {
      return productCates.filter((item: any) =>
        maxkleenProductCateIds.includes(String(item?.id ?? "").toLowerCase()),
      );
    }
    if (brandId?.toLowerCase() === "enchantuer") {
      return productCates.filter((item: any) =>
        enchantuerProductCateIds.includes(String(item?.id ?? "").toLowerCase()),
      );
    }
    return productCates;
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
  const [metrics, setMetrics] = useState({
    gpu: 12,
    ram: 2.4,
    latency: 18,
    health: "Optimal",
  });
  const productCateOptions = getProductCateOptionsByBrand(config.model);
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

  const getItemLabelById = (list: any[], id: string) => {
    const found = list.find((item: any) => item.id === id);
    return String(found?.label ?? found?.id ?? id ?? "").trim();
  };

  const normalizePathToken = (value: string) =>
    value.trim().replace(/\s+/g, "-").replace(/\/+/g, "-");

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
        const res = await fetch(
          `${baseUrl}/api/sftp/exists?scope=demo&path=${encodeURIComponent(`/script/demo/${targetPath}`)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          const exists = Boolean(
            res.ok &&
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

  const readEntry = (entry: any): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => resolve([file]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        reader.readEntries(async (entries: any[]) => {
          const files = await Promise.all(entries.map(readEntry));
          resolve(files.flat());
        });
      } else {
        resolve([]);
      }
    });
  };
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

  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
  const TEXT_EXTS = [".html", ".htm", ".js"];

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;
    setError(null);

    const validEntries: { file: File }[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
      const isImageExt = IMAGE_EXTS.includes(ext);
      const isTextExt = TEXT_EXTS.includes(ext);
      const isSupportedMime =
        file.type.startsWith("image/") ||
        [
          "text/html",
          "application/xhtml+xml",
          "application/javascript",
          "text/javascript",
        ].includes(file.type);

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 10MB limit.`);
        return;
      }
      if (!isImageExt && !isTextExt && !isSupportedMime) {
        errors.push(
          `${file.name} is not a supported format (image/html/js only).`,
        );
        return;
      }
      validEntries.push({ file });
    });

    const fileArray: UploadedFile[] = await Promise.all(
      validEntries.map(async ({ file }) => {
        const id = Math.random().toString(36).substring(7);
        const timestamp = Date.now();
        const isImage =
          file.type.startsWith("image/") ||
          IMAGE_EXTS.includes(
            `.${file.name.split(".").pop() ?? ""}`.toLowerCase(),
          );
        let imageBase64: ImageBase64Entry | undefined;
        if (isImage) {
          const base64 = await compressImageToDataUrl(file, 0.7);
          imageBase64 = { name: file.name, base64 };
        }
        return {
          id,
          file,
          preview: isImage ? URL.createObjectURL(file) : "",
          status: "success" as const,
          timestamp,
          imageBase64,
        };
      }),
    );

    if (errors.length > 0) {
      setError({
        message: `Failed to ingest ${errors.length} assets:\n${errors.join(
          "\n",
        )}`,
        type: "validation",
        actionLabel: "View Guidelines",
        action: () =>
          alert(
            "Supported formats:\n- Images: PNG, JPG, JPEG, WEBP (<= 10MB)\n- HTML: .html, .htm\n- JS: .js",
          ),
      });
    }

    setFiles((prev) => [...prev, ...fileArray]);
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const allFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = (item as any).webkitGetAsEntry?.();

      if (entry) {
        const files = await readEntry(entry);
        allFiles.push(...files);
      }
    }

    // Convert array → FileList giả
    if (allFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      allFiles.forEach((file) => dataTransfer.items.add(file));
      handleFiles(dataTransfer.files);
    }
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
    const images = files
      .filter((f) => f.imageBase64)
      .map((f) => f.imageBase64!)
      .filter(Boolean);
    if (images.length === 0) return content;

    // Replace each manifest entry line that contains the original image name,
    // so we can also inject `type:createjs.AbstractLoader.IMAGE`.
    const lines = content.split(/\r?\n/);

    for (const img of images) {
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

  const handleReplaceBase64AndUploadSftp = async () => {
    setSendError(null);
    setSendSuccess(null);

    const targetPath = sourceUrl.trim();
    if (!targetPath) {
      setSendError("Missing remote source path.");
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

    if (textFiles.length === 0) {
      setSendError("No HTML/JS files found to replace base64 and upload.");
      return;
    }

    const remoteBase = `/script/demo/${targetPath}`.replace(/\/{2,}/g, "/");

    try {
      const checkRes = await fetch(
        `${baseUrl}/api/sftp/exists?scope=demo&path=${encodeURIComponent(remoteBase)}`,
      );
      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData?.ok) {
        setSendError(
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
      setSendError("Cannot verify remote path on SFTP (network error).");
      return;
    }

    setSendingToSftp(true);
    try {
      // Nếu người dùng upload nhiều HTML (.html/.htm), chỉ đổi file đầu tiên thành index.html
      // để tránh ghi đè.
      let indexHtmlUploaded = false;
      for (const item of textFiles) {
        const rawContent = await item.file.text();
        const convertedContent = replaceImagesToBase64(rawContent);

        const ext = item.file.name.split(".").pop()?.toLowerCase();
        const isHtml = ext === "html" || ext === "htm";
        const remoteFileName =
          isHtml && !indexHtmlUploaded ? "index.html" : item.file.name;
        if (isHtml && !indexHtmlUploaded) indexHtmlUploaded = true;

        const remoteFilePath = `${remoteBase}/${remoteFileName}`.replace(
          /\/{2,}/g,
          "/",
        );

        const res = await fetch(`${baseUrl}/api/sftp/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: remoteFilePath,
            content: convertedContent,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Upload failed for ${item.file.name}`);
        }
      }

      setSendSuccess(
        `Uploaded ${textFiles.length} file(s) to ${remoteBase} with base64 replacement.`,
      );

      await openYomediaDemoPreview({
        remotePath: targetPath,
        serverApiUrl: baseUrl,
      });
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Upload to SFTP failed.",
      );
    } finally {
      setSendingToSftp(false);
    }
  };

  return (
    <div className="max-w-full mx-auto">
      <header className="mb-8 relative">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
            Build Demo
          </h1>
        </div>
        <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[9px] ml-4">
          Neural Asset Ingestion & Creative Pipeline
        </p>
        <div className="absolute -bottom-3 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
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
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 flex items-start gap-4">
                  <div className="p-2 bg-rose-500/20 rounded-xl shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">
                      {error.type} Error Detected
                    </h4>
                    <p className="text-xs text-rose-200/70 font-medium leading-relaxed">
                      {error.message}
                    </p>
                    {error.action && (
                      <button
                        onClick={error.action}
                        className="mt-3 flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors"
                      >
                        <ArrowPathIcon className="w-3 h-3" />
                        {error.actionLabel || "Retry Action"}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-rose-400/50 hover:text-rose-400 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative h-[420px] rounded-[3rem] border border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12 text-center cursor-pointer overflow-hidden group ${
              isDragging
                ? "border-[#4cceac] bg-[#4cceac]/5 scale-[1.01] shadow-[0_0_50px_rgba(76,206,172,0.1)]"
                : "border-white/10 bg-[#1f2a40]/20 hover:border-[#4cceac]/40 hover:bg-[#1f2a40]/40"
            }`}
          >
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.html,.htm,.js"
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              ref={(input) => {
                if (input) {
                  // Cho phép chọn folder (ví dụ folder 'images' chứa nhiều ảnh)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (input as any).webkitdirectory = true;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (input as any).directory = true;
                }
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
              className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 relative ${
                isDragging
                  ? "bg-[#4cceac] text-[#141b2d]"
                  : "bg-[#141b2d] text-[#4cceac]"
              } transition-all duration-500 shadow-2xl`}
            >
              <CloudArrowUpIcon className="w-12 h-12" />
              {!isDragging && (
                <div className="absolute inset-0 rounded-[2rem] border border-[#4cceac]/20 animate-ping" />
              )}
            </motion.div>

            <h3 className="text-2xl font-black text-white mb-3 tracking-tight uppercase italic">
              {isDragging ? "Release to Ingest" : "Drop Assets Here"}
            </h3>
            <p className="text-[#a3a3a3] max-w-sm mx-auto text-xs font-medium leading-relaxed tracking-wide">
              INTELLIGENT UPLOAD SYSTEM v2.0
              <br />
              <span className="opacity-60">
                PNG • JPG • WEBP • HTML • JS • MAX 10MB
              </span>
            </p>

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
          {directoryExists && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Directory Exists - Replacement Name
                </label>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={replacementName}
                  onChange={(e) => setReplacementName(e.target.value)}
                  placeholder="Enter new folder/file token"
                  className="w-full bg-[#141b2d] border border-amber-400/30 rounded-2xl py-4 px-5 text-sm font-medium text-white outline-none focus:border-amber-300 transition-all placeholder-white/20 shadow-xl"
                />
              </div>
              <p className="text-[11px] text-amber-300/80">
                Current path already exists on SFTP. Enter a new name to avoid
                overwrite.
                {checkingDirectory ? " Checking..." : ""}
              </p>
            </div>
          )}
          {/* Configuration Section */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
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
                  className={`w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl ${
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
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <BoltIcon className="w-4 h-4 text-[#4cceac]" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                >
                  {productCateOptions.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
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
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                >
                  {seasons.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
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
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold text-white outline-none cursor-default shadow-xl"
                >
                  {years.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <PhotoIcon className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold text-white outline-none cursor-default shadow-xl"
                >
                  {months.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <SignalIcon className="w-4 h-4 text-rose-400" />
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="mt-12 flex flex-wrap gap-6 items-center">
            <button
              type="button"
              onClick={handleReplaceBase64AndUploadSftp}
              disabled={
                !sourceUrl.trim() ||
                files.length === 0 ||
                sendingToSftp ||
                checkingDirectory ||
                (directoryExists && !replacementName.trim())
              }
              className="flex-1 min-w-[200px] py-5 rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-[#3d465d] disabled:to-[#3d465d] disabled:opacity-60 text-white font-black border border-white/10 shadow-[0_8px_24px_rgba(139,92,246,0.25)] transition-all uppercase tracking-widest text-[10px] italic flex items-center justify-center gap-2"
            >
              {sendingToSftp ? "Uploading..." : "Replace base64 + Upload SFTP"}
            </button>
            <button
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
              }}
              disabled={files.length === 0 && !sourceUrl}
              className="px-10 py-5 min-w-[120px] bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-black rounded-3xl border border-white/5 transition-all uppercase tracking-widest text-[10px] italic flex items-center justify-center"
            >
              Reset
            </button>
          </div>
          {sendError && (
            <p className="mt-2 text-sm text-red-400 font-medium">{sendError}</p>
          )}
          {sendSuccess && (
            <p className="mt-2 text-sm text-emerald-400 font-medium">
              {sendSuccess}
            </p>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="bg-[#141b2d] rounded-[3rem] border border-white/5 p-8 shadow-2xl flex flex-col h-[700px] relative overflow-hidden">
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
                  <button
                    onClick={() => setFilterType("all")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all ${filterType === "all" ? "bg-[#4cceac] text-[#141b2d]" : "text-[#a3a3a3] hover:text-white"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType("recent")}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all ${filterType === "recent" ? "bg-[#4cceac] text-[#141b2d]" : "text-[#a3a3a3] hover:text-white"}`}
                  >
                    Recent
                  </button>
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
                          if (file.file.type.startsWith("image/")) {
                            setSelectedImage(file.preview);
                          } else if (
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
                            <button
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
                            </button>
                          )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="bg-red-500/20 text-red-400 p-0.5 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
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
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-[#e0e0e0] hover:text-[#4cceac] transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
              >
                <XMarkIcon className="w-6 h-6" />
                Close Review
              </button>
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
                  <button
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
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTextFile(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-[10px] text-[#e5e7eb] uppercase tracking-widest hover:bg-white/10"
                  >
                    Close
                  </button>
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
