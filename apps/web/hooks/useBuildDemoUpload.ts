import { useCallback, useEffect, useRef, useState } from "react";

const IMAGE_EXTS: string[] = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
const VIDEO_EXTS: string[] = [".mp4", ".webm", ".mov"];
const TEXT_EXTS: string[] = [".html", ".htm", ".js", ".mjs"];
const TEXT_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "application/javascript",
  "text/javascript",
  "text/jsx",
]);

export interface ErrorState {
  message: string;
  type: "validation" | "processing" | "system" | "partial";
  action?: () => void;
  actionLabel?: string;
}

export interface ImageBase64Entry {
  name: string;
  base64: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  relativePath: string;
  preview: string;
  status: "uploading" | "success" | "error";
  timestamp: number;
  imageBase64?: ImageBase64Entry;
}

/** Đường dẫn tương đối khi kéo-thả folder — không gán vào File (webkitRelativePath chỉ đọc). */
const dropRelativePathByFile = new WeakMap<File, string>();

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

function readEntry(entry: FileSystemEntry, pathPrefix: string): Promise<File[]> {
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
          const nested = await Promise.all(entries.map((e) => readEntry(e, dirPath)));
          resolve(nested.flat());
        })
        .catch(reject);
    } else {
      resolve([]);
    }
  });
}

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

      try {
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Image compression failed"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    img.src = objectUrl;
  });

export function useBuildDemoUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ignoreNextDropzoneClick = useRef(false);

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
    };
  }, [files]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = useCallback(async (newFiles: FileList | null) => {
    if (!newFiles) return;
    setError(null);

    const validEntries: { file: File }[] = [];
    const validationErrors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      if (isDroppedFolderPlaceholder(file)) return;

      const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
      const isImageExt = IMAGE_EXTS.includes(ext);
      const isTextExt = TEXT_EXTS.includes(ext);
      const isVideoExt = VIDEO_EXTS.includes(ext);
      const isSupportedMime =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        TEXT_MIME_TYPES.has(file.type);

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
        const isImage = file.type.startsWith("image/") || IMAGE_EXTS.includes(ext);
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
            (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
            file.name,
          preview: isImage ? URL.createObjectURL(file) : "",
          status: "success",
          timestamp,
          imageBase64,
        });
      } catch (err) {
        processingErrors.push(
          `${file.name}: ${err instanceof Error ? err.message : "processing failed"}`,
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
          message: `Failed to ingest ${allSkipped.length} assets:\n${allSkipped.join("\n")}`,
          type: "validation",
          actionLabel: "View Guidelines",
          action: guidelinesAction,
        });
      }
    }

    setFiles((prev) => [...prev, ...fileArray]);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      ignoreNextDropzoneClick.current = true;
      window.setTimeout(() => {
        ignoreNextDropzoneClick.current = false;
      }, 400);

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
            // ignore entry read failure to keep processing other files
          }
        } else {
          allFiles.push(snap.file);
        }
      }

      const merged = mergeDroppedFiles([...allFiles, ...fileListFallback]);
      if (merged.length === 0) return;

      const dt = new DataTransfer();
      merged.forEach((file) => dt.items.add(file));
      void handleFiles(dt.files);
    },
    [handleFiles],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  }, []);

  const clearUploadState = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
    setError(null);
    setIsDragging(false);
    ignoreNextDropzoneClick.current = false;
  }, []);

  return {
    files,
    setFiles,
    error,
    setError,
    isDragging,
    ignoreNextDropzoneClick,
    handleFiles,
    onDragOver,
    onDragLeave,
    onDrop,
    removeFile,
    clearUploadState,
  };
}
