import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import {
  CloudArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  CpuChipIcon,
  BoltIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import demoConfig from "../data/demoConfig.json";
import defaultImages from "../data/defaultImages.json";
import scriptReplacements from "../data/scriptReplacements.json";

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
  const seasons = ["Spring", "Summer", "Autumn", "Winter"];

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
    season: seasons[0] ?? "Spring",
  });
  const [sourceUrl, setSourceUrl] = useState("");
  const [outputLink, setOutputLink] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [filterType, setFilterType] = useState<"all" | "recent">("all");
  const [sendStatus, setSendStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentFileName, setLastSentFileName] = useState<string | null>(null);
  /** Nội dung file HTML/JS đã replace khi bấm Generate (bootstrap callback support: → yomedia) */
  const [replacedContent, setReplacedContent] = useState<string | null>(null);
  const [convertedImages, setConvertedImages] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    gpu: 12,
    ram: 2.4,
    latency: 18,
    health: "Optimal",
  });

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

  const applyImagesToJs = (
    content: string,
    imagePayload: { name: string; base64: string }[],
  ) => {
    if (imagePayload.length === 0) {
      return { processed: content, converted: [] as string[] };
    }

    const lines = content.split(/\r?\n/);
    const converted: string[] = [];

    for (const img of imagePayload) {
      const pathInContent = `images/${img.name}`;
      const encodedName = encodeURIComponent(img.name);
      const encodedPathInContent = `images/${encodedName}`;
      const isDefaultImage = (defaultImages as string[]).includes(
        pathInContent,
      );
      const base64Only = img.base64.includes(",")
        ? img.base64.split(",")[1]!
        : img.base64;
      const dataUrlPng = `data:image/png;base64,${base64Only}`;
      const dataUrl = isDefaultImage ? dataUrlPng : img.base64;
      let foundIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const searchName = img.name;
        const hasPathEncoded = line.includes(encodedPathInContent);
        const hasPath = line.includes(pathInContent);
        const hasName = line.includes(searchName);
        if (!hasPathEncoded && !hasPath && !hasName) continue;

        const idx = hasPathEncoded
          ? line.indexOf(encodedPathInContent)
          : hasPath
            ? line.indexOf(pathInContent)
            : line.indexOf(searchName);
        const replaceLength = hasPathEncoded
          ? encodedPathInContent.length
          : hasPath
            ? pathInContent.length
            : searchName.length;
        const afterNameIndex = idx + replaceLength;
        const nextQuoteIndex = line.indexOf('"', afterNameIndex);
        const suffix =
          nextQuoteIndex === -1
            ? line.slice(afterNameIndex)
            : line.slice(nextQuoteIndex);
        const suffixAfterQuote = suffix.startsWith('"')
          ? suffix.slice(1)
          : suffix;

        if (isDefaultImage) {
          line = line.slice(0, idx) + dataUrlPng + line.slice(afterNameIndex);
          lines[i] = line;
        } else {
          lines[i] =
            `{type:createjs.Types.IMAGE, src:"${dataUrl}"${suffixAfterQuote}`;
        }
        foundIndex = i;
        break;
      }

      if (foundIndex >= 0) {
        converted.push(img.name);
      }
    }

    return { processed: lines.join("\n"), converted };
  };

  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
  const TEXT_EXTS = [".html", ".htm", ".js"];

  const applyScriptReplacements = (content: string) => {
    let result = content;
    (scriptReplacements as { name: string; base64: string }[]).forEach(
      (item) => {
        if (!item.name || !item.base64) return;
        const escaped = item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "g");
        result = result.replace(regex, item.base64);
      },
    );
    return result;
  };

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

  const handleProcess = () => {
    setError(null);
    setIsProcessing(true);
    setOutputLink(null);

    // Require model selection
    if (!config.model) {
      setError({
        message: "Please select a Model Intelligence before processing.",
        type: "validation",
      });
      setIsProcessing(false);
      return;
    }

    // Validation: Source
    if (files.length === 0 && !sourceUrl) {
      setError({
        message:
          "No assets detected. Please upload files or provide a remote source URL.",
        type: "validation",
      });
      setIsProcessing(false);
      return;
    }

    // Validation: URL Format
    if (sourceUrl && !sourceUrl.startsWith("http")) {
      setError({
        message:
          "Invalid remote source URL. Ensure it starts with http:// or https://",
        type: "validation",
      });
      setIsProcessing(false);
      return;
    }

    // Replace string khi Generate:
    // Ưu tiên file JS đầu tiên; nếu không có thì dùng file HTML đầu tiên.
    const firstJsFile = files.find((f) =>
      ["application/javascript", "text/javascript"].includes(f.file.type),
    );
    const firstHtmlFile = files.find((f) =>
      ["text/html", "application/xhtml+xml"].includes(f.file.type),
    );
    const firstHtmlJs = firstJsFile ?? firstHtmlFile;
    const doReplaceAndSimulate = (contentToUse: string | null) => {
      let processedContent = contentToUse;
      if (processedContent !== null) {
        const replaced = processedContent.replace(
          /bootstrap callback support:/g,
          "bootstrap callback support: yomedia ",
        );
        processedContent = replaced;
      }

      if (processedContent !== null && firstHtmlJs) {
        // Chuẩn bị danh sách ảnh: lấy từ state files (đã có base64 từ client)
        const imagePayload = files
          .filter((f) => f.file.type.startsWith("image/") && f.imageBase64)
          .map((f) => ({
            name: f.imageBase64!.name,
            base64: f.imageBase64!.base64,
          }));

        const { processed, converted } = applyImagesToJs(
          processedContent,
          imagePayload,
        );
        processedContent = applyScriptReplacements(processed);
        setConvertedImages(converted);
        // Lưu lại tên file JS đã xử lý để upload / download dùng đúng nội dung đã replace base64
        if (firstJsFile) {
          setLastSentFileName(firstJsFile.file.name);
        } else {
          setLastSentFileName(firstHtmlJs.file.name);
        }
      }

      setReplacedContent(processedContent);

      setTimeout(() => {
        const shouldFail = Math.random() > 0.9; // 10% failure rate for demo
        if (shouldFail) {
          setIsProcessing(false);
          setError({
            message:
              "Neural pipeline synthesis failed due to high cluster latency.",
            type: "processing",
            actionLabel: "Retry Synthesis",
            action: handleProcess,
          });
        } else {
          setIsProcessing(false);
          setOutputLink(
            `https://nova-ai.io/demo/${Math.random().toString(36).substring(7)}`,
          );
        }
      }, 2000);
    };
    if (firstHtmlJs) {
      const reader = new FileReader();
      reader.onload = () => doReplaceAndSimulate(String(reader.result ?? ""));
      reader.onerror = () => {
        setIsProcessing(false);
        setError({ message: "Failed to read file", type: "system" });
      };
      reader.readAsText(firstHtmlJs.file);
    } else {
      doReplaceAndSimulate(null);
    }
  };

  const TEXT_FILE_TYPES = [
    "text/html",
    "application/xhtml+xml",
    "application/javascript",
    "text/javascript",
  ];

  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

  /** Đường dẫn SFTP demo: year/month/brand/productCate/tên-file-html (vd: 2026/03/maxkleen/laundry/384x683) */
  const getDemoSftpPath = (): string | null => {
    const year = config.quality?.trim();
    const month = config.mode?.trim();
    const brand = config.model?.trim()?.toLowerCase();
    const productCate = config.productCate?.trim()?.toLowerCase();
    const firstHtml = files.find((f) =>
      ["text/html", "application/xhtml+xml"].includes(f.file.type),
    );
    const htmlName = firstHtml
      ? firstHtml.file.name.replace(/\.[^.]+$/, "").trim()
      : "";
    if (!year || !month || !brand || !productCate || !htmlName) return null;
    return [year, month, brand, productCate, htmlName].join("/");
  };

  const handleUploadDemoToSftp = async () => {
    const path = getDemoSftpPath();
    if (!path) {
      setSendError(
        "Missing Year/Month/Brand/Product Category or HTML file for SFTP path.",
      );
      return;
    }

    const firstHtml = files.find((f) =>
      ["text/html", "application/xhtml+xml"].includes(f.file.type),
    );
    const firstJs = files.find((f) =>
      ["application/javascript", "text/javascript"].includes(f.file.type),
    );

    if (!firstHtml || !firstJs) {
      setSendError("Need both one HTML file and one JS file to upload to SFTP.");
      return;
    }

    const readFileAsText = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsText(file);
      });

    try {
      setSendStatus("sending");
      setSendError(null);

      const htmlPath = `${path}/${firstHtml.file.name}`;
      const jsPath = `${path}/${firstJs.file.name}`;

      const [htmlContentRaw, jsContentRaw] = await Promise.all([
        readFileAsText(firstHtml.file),
        readFileAsText(firstJs.file),
      ]);

      const jsContent =
        replacedContent && firstJs.file.name === lastSentFileName
          ? replacedContent
          : jsContentRaw;
      if (replacedContent && firstJs.file.name === lastSentFileName) {
        console.log(
          "[SFTP Upload] Using REPLACED JS content for",
          firstJs.file.name,
        );
      } else {
        console.log(
          "[SFTP Upload] Using ORIGINAL JS content for",
          firstJs.file.name,
        );
      }

      const writeFileToSftp = async (filePath: string, content: string) => {
        const res = await fetch(`${baseUrl}/api/sftp/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error || `Failed to upload ${filePath} to SFTP.`,
          );
        }
      };

      await writeFileToSftp(htmlPath, htmlContentRaw);
      await writeFileToSftp(jsPath, jsContent);

      setSendStatus("success");
      setSendError("Uploaded demo files to SFTP successfully.");
    } catch (err) {
      setSendStatus("error");
      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to upload demo files to SFTP.",
      );
    } finally {
      setTimeout(() => {
        setSendStatus("idle");
      }, 800);
    }
  };

  const handleDownloadFromServer = async () => {
    const htmlOrJsFiles = files.filter((f) =>
      TEXT_FILE_TYPES.includes(f.file.type),
    );
    if (htmlOrJsFiles.length === 0) {
      setSendError("No HTML or JS file to download.");
      return;
    }

    const zip = new JSZip();
    const processedName = lastSentFileName ?? null;

    const readFileAsText = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsText(file);
      });

    try {
      for (const { file } of htmlOrJsFiles) {
        const content =
          replacedContent && file.name === processedName
            ? replacedContent
            : await readFileAsText(file);
        if (
          replacedContent &&
          file.name === processedName &&
          (file.type === "application/javascript" || file.type === "text/javascript")
        ) {
          console.log("[Replaced JS content]", file.name, "\n", content);
        }
        zip.file(file.name, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const firstHtml = htmlOrJsFiles.find((f) =>
        ["text/html", "application/xhtml+xml"].includes(f.file.type),
      );
      const zipBaseName = firstHtml
        ? firstHtml.file.name.replace(/\.[^.]+$/, "")
        : "bundle";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${zipBaseName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setSendError(null);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to create zip.",
      );
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
                  onChange={(e) =>
                    setConfig({ ...config, model: e.target.value })
                  }
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold text-white outline-none focus:border-[#4cceac]/50 transition-all appearance-none cursor-pointer shadow-xl"
                >
                  <option value="" disabled>
                    Select model...
                  </option>
                  {brands.map((item: any) => (
                    <option key={item.id} value={item.id}>
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
                  {productCates.map((item: any) => (
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
          {/* Source & Output Section */}
          <div className="mt-10 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                  Remote Source URL (Optional)
                </label>
              </div>
              <div className="relative group">
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://assets.example.com/bundle.zip"
                  className="w-full bg-[#141b2d] border border-white/5 rounded-2xl py-5 px-6 text-sm font-medium text-white outline-none focus:border-[#4cceac]/50 transition-all placeholder-white/10 shadow-xl"
                />
              </div>
            </div>

            <AnimatePresence>
              {outputLink && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-6 bg-[#4cceac]/10 border border-[#4cceac]/20 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4cceac] rounded-2xl flex items-center justify-center text-[#141b2d] shadow-lg shadow-[#4cceac]/20">
                      <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#e0e0e0]">
                        Processing Complete
                      </h4>
                      <p className="text-xs text-[#4cceac] font-medium">
                        Your demo is ready at the link below
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#141b2d] p-2 pl-4 rounded-xl border border-white/5 w-full md:w-auto">
                    <span className="text-xs text-[#a3a3a3] truncate max-w-[200px]">
                      {outputLink}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(outputLink);
                        // Optional: Show toast
                      }}
                      className="bg-[#4cceac] text-[#141b2d] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#3da58a] transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex gap-6">
            <button
              onClick={handleProcess}
              disabled={
                !config.model ||
                (files.length === 0 && !sourceUrl) ||
                isProcessing
              }
              className="flex-1 bg-gradient-to-r from-[#4cceac] to-[#3da58a] hover:from-[#3da58a] hover:to-[#4cceac] disabled:from-[#3d465d] disabled:to-[#3d465d] disabled:cursor-not-allowed text-[#141b2d] font-black py-5 rounded-3xl transition-all shadow-[0_20px_40px_rgba(76,206,172,0.15)] flex items-center justify-center gap-3 uppercase tracking-widest text-xs italic"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-[#141b2d] border-t-transparent rounded-full"
                  />
                  Synthesizing Pipeline...
                </>
              ) : (
                <>
                  <BoltIcon className="w-5 h-5" />
                  Generate {files.length || (sourceUrl ? "Remote" : "0")}
                </>
              )}
            </button>
            <button
              onClick={handleDownloadFromServer}
              disabled={
                !files.some((f) => TEXT_FILE_TYPES.includes(f.file.type)) ||
                sendStatus === "sending"
              }
              className="px-10 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-black rounded-3xl border border-white/5 transition-all uppercase tracking-widest text-[10px] italic flex items-center gap-2"
              title="Tải zip chứa HTML + JS (tên zip theo file HTML)"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download
            </button>
            <button
              onClick={handleUploadDemoToSftp}
              disabled={
                !getDemoSftpPath() ||
                !replacedContent ||
                !lastSentFileName ||
                isProcessing ||
                sendStatus === "sending"
              }
              className="px-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-[#3d465d] disabled:to-[#3d465d] disabled:opacity-60 text-white font-black rounded-3xl border border-white/10 shadow-[0_8px_24px_rgba(139,92,246,0.25)] transition-all uppercase tracking-widest text-[10px] italic flex items-center gap-2"
              title={
                getDemoSftpPath()
                  ? `Upload HTML & JS to SFTP: ${getDemoSftpPath()}`
                  : "Cần Year/Month/Brand/Product Category và ít nhất 1 file HTML + 1 file JS"
              }
            >
              <SignalIcon className="w-5 h-5" />
              {sendStatus === "sending" ? "Uploading..." : "Demo"}
            </button>
            <button
              onClick={() => {
                setFiles([]);
                setSourceUrl("");
                setOutputLink(null);
                setError(null);
                setSendStatus("idle");
                setSendError(null);
                setLastSentFileName(null);
                setReplacedContent(null);
                setSelectedImage(null);
                setSelectedTextFile(null);
                setFilterType("all");
                setConvertedImages([]);

                // Gọi server xóa toàn bộ file đã upload
                fetch(`${baseUrl}/api/upload`, { method: "DELETE" }).catch(
                  () => {
                    // ignore errors on reset
                  },
                );
              }}
              disabled={(files.length === 0 && !sourceUrl) || isProcessing}
              className="px-10 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-black rounded-3xl border border-white/5 transition-all uppercase tracking-widest text-[10px] italic"
            >
              Reset
            </button>
          </div>
          {sendError && (
            <p className="mt-2 text-sm text-red-400 font-medium">{sendError}</p>
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
                        {file.file.type.startsWith("image/") &&
                          (convertedImages.includes(file.file.name) ||
                            (file.imageBase64 &&
                              convertedImages.includes(
                                file.imageBase64.name,
                              ))) && (
                            <motion.div
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 20,
                              }}
                              className="bg-[#4cceac] text-[#141b2d] p-0.5 rounded-full shadow-[0_0_16px_rgba(76,206,172,0.9)]"
                            >
                              <CheckCircleIcon className="w-3 h-3" />
                            </motion.div>
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
