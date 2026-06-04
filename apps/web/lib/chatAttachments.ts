export type ChatSelectedUpload = {
  file: File;
  relativePath: string;
};

const MAX_FILES = 80;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const SUPPORTED_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mkv",
  ".mpeg",
  ".mpg",
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".css",
  ".zip",
]);

const VIDEO_EXT = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mkv",
  ".mpeg",
  ".mpg",
]);

/** Extension from leaf name (handles paths from folder drop). */
export function getChatUploadFileExtension(file: File): string {
  const leaf = (fileRelativePath(file).split(/[/\\]/).pop() || file.name).trim();
  const dot = leaf.lastIndexOf(".");
  if (dot < 1 || dot >= leaf.length - 1) return "";
  return leaf.slice(dot).toLowerCase();
}

function isSupportedChatUploadMime(file: File, ext: string): boolean {
  const type = file.type || "";
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    [
      "text/html",
      "application/xhtml+xml",
      "application/javascript",
      "text/javascript",
      "application/zip",
      "application/x-zip-compressed",
    ].includes(type)
  ) {
    return true;
  }
  // Windows often reports video as application/octet-stream when the registry entry is missing.
  return type === "application/octet-stream" && VIDEO_EXT.has(ext);
}

/** Relative path when drag-dropping folders (webkitRelativePath is read-only on File). */
const dropRelativePathByFile = new WeakMap<File, string>();

export function setChatDropRelativePath(file: File, relativePath: string): void {
  dropRelativePathByFile.set(file, relativePath.replace(/\\/g, "/"));
}

export function fileRelativePath(file: File): string {
  const fromDrop = dropRelativePathByFile.get(file)?.trim();
  const rel =
    fromDrop ||
    (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim();
  return (rel || file.name).replace(/\\/g, "/");
}

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

function readDropEntry(
  entry: FileSystemEntry,
  pathPrefix: string,
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file) => {
          setChatDropRelativePath(file, `${pathPrefix}${file.name}`);
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
            entries.map((e) => readDropEntry(e, dirPath)),
          );
          resolve(nested.flat());
        })
        .catch(reject);
    } else {
      resolve([]);
    }
  });
}

/** Collect files from drag-and-drop (files or whole folder trees). */
export async function collectFilesFromDataTransfer(
  dt: DataTransfer,
): Promise<File[]> {
  const items = dt.items;
  if (items?.length) {
    const fromEntries: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i]?.webkitGetAsEntry?.() ?? null;
      if (entry) {
        fromEntries.push(...(await readDropEntry(entry, "")));
        continue;
      }
      const file = items[i]?.getAsFile();
      if (file && !isFolderPlaceholderFile(file)) fromEntries.push(file);
    }
    if (fromEntries.length > 0) return fromEntries;
  }

  return Array.from(dt.files ?? []).filter((f) => !isFolderPlaceholderFile(f));
}

/** Folder drag placeholder (0-byte, no extension) from some browsers. */
export function isFolderPlaceholderFile(file: File): boolean {
  if (file.size !== 0) return false;
  const base = file.name.split(/[/\\]/).pop() ?? file.name;
  if (base.includes(".")) return false;
  const t = file.type || "";
  return t === "" || t === "application/octet-stream";
}

function uploadDedupeKey(file: File): string {
  const rel = fileRelativePath(file);
  return `${rel}\0${file.size}\0${file.lastModified}`;
}

export function mergeChatUploads(
  existing: ChatSelectedUpload[],
  incoming: FileList | File[],
): { uploads: ChatSelectedUpload[]; skipped: string[] } {
  const skipped: string[] = [];
  const byKey = new Map(
    existing.map((u) => [uploadDedupeKey(u.file), u] as const),
  );

  for (const file of Array.from(incoming)) {
    if (isFolderPlaceholderFile(file)) continue;

    const ext = getChatUploadFileExtension(file);

    if (!SUPPORTED_EXT.has(ext) && !isSupportedChatUploadMime(file, ext)) {
      skipped.push(`${fileRelativePath(file)}: định dạng không hỗ trợ`);
      continue;
    }

    const isVideo =
      VIDEO_EXT.has(ext) || (file.type || "").startsWith("video/");
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
    if (file.size > maxBytes) {
      skipped.push(
        `${fileRelativePath(file)}: vượt giới hạn ${isVideo ? "500MB" : "10MB"}`,
      );
      continue;
    }

    const key = uploadDedupeKey(file);
    if (byKey.has(key)) continue;
    byKey.set(key, { file, relativePath: fileRelativePath(file) });
  }

  const uploads = [...byKey.values()];
  if (uploads.length > MAX_FILES) {
    skipped.push(`Chỉ gửi tối đa ${MAX_FILES} file mỗi lần.`);
    return { uploads: uploads.slice(0, MAX_FILES), skipped };
  }

  return { uploads, skipped };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Không đọc được file upload"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Không đọc được file upload"));
    reader.readAsDataURL(file);
  });
}

export function formatSelectedUploadsSummary(uploads: ChatSelectedUpload[]): string {
  if (uploads.length === 0) return "";
  if (uploads.length === 1) return uploads[0]!.relativePath;
  const preview = uploads
    .slice(0, 3)
    .map((u) => u.relativePath)
    .join(", ");
  const more = uploads.length > 3 ? ` (+${uploads.length - 3} file)` : "";
  return `${uploads.length} file: ${preview}${more}`;
}
