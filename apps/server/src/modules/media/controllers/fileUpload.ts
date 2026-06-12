import { Router, Request, Response } from "express";
import { asyncHandler, HttpError } from "../../../lib/http/errors.js";
import { getUserRole } from "../../auth/lib/role.js";
import { requireClerkAuth } from "../../auth/lib/clerkAuth.js";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  uploadSftpBuffer,
  sftpPathExists,
  verifySftpWritableDirectory,
} from "../../../lib/sftp/index.js";
import {
  isCompressibleVideoFilename,
  maybeCompressVideoUpload,
} from "../../../lib/media/videoCompress.js";

const router = Router();
router.use(requireClerkAuth);
const FILE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "file-center");
const ALLOWED_ROLES = new Set(["admin", "design"]);
const MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
/** Tổng dung lượng mọi file trong một request upload folder. */
const MAX_FOLDER_BATCH_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_FOLDER_EXTENSIONS = new Set(["fla", "psd"]);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREATIVE_DEMOS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "creative-demos.json",
);
const TEST_JSON_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "test.json",
);

function toSafeRelativePath(input: string): string | null {
  const normalized = input.replace(/\\/g, "/").replace(/^\/+/, "");
  const safe = path.posix.normalize(normalized);
  if (
    !safe ||
    safe === "." ||
    safe.startsWith("../") ||
    safe.includes("/../")
  ) {
    return null;
  }
  return safe;
}

function mapSourceToSftpRoot(source: string): string {
  const normalized = source
    .trim()
    .replace(/\\+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  if (!normalized) return "/script/demo";
  if (normalized.startsWith("script/demo/") || normalized === "script/demo") {
    return `/${normalized}`;
  }
  return `/script/demo/${normalized}`.replace(/\/{2,}/g, "/");
}

/** If source is blank in creative-demos.json, use the same layout as populated rows. */
function defaultDemoSourceFromId(demoId: string): string {
  const id = demoId.trim();
  if (!id) return "";
  return `yomedia/app/template/data/${id}/banner`;
}

function isTooLarge(buffer: Buffer): boolean {
  return buffer.length > MAX_UPLOAD_SIZE_BYTES;
}

function hasAllowedFolderExtension(relativePath: string): boolean {
  const ext = path.posix.extname(relativePath).slice(1).toLowerCase();
  return ALLOWED_FOLDER_EXTENSIONS.has(ext);
}

type DemoRow = {
  id?: string;
  title?: string;
  source?: string;
  category?: string;
  fla?: boolean;
};

async function recordFolderUploadToTestJson(payload: {
  categoryFilter?: string;
  demoTitle: string;
  folderName: string;
  uploadedEntries: { relativePath: string; sizeBytes: number }[];
  demo: DemoRow | undefined;
  source: string;
  sftpBaseDir: string;
  uploadedCount: number;
  localRootFolder: string;
  sftpUploadedPaths: string[];
}): Promise<void> {
  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(TEST_JSON_PATH, "utf8");
    const t = raw.trim();
    if (t) existing = JSON.parse(t) as Record<string, unknown>;
  } catch {
    existing = {};
  }

  const at = new Date().toISOString();
  const record = {
    at,
    fields: {
      categoryFilter: payload.categoryFilter ?? "",
      demoTitle: payload.demoTitle,
      folderName: payload.folderName,
    },
    demo: {
      id: payload.demo?.id ?? null,
      title: payload.demo?.title ?? payload.demoTitle,
      category: payload.demo?.category ?? null,
      source: payload.source,
    },
    files: payload.uploadedEntries.map((z, i) => ({
      index: i + 1,
      name: z.relativePath,
      sizeBytes: z.sizeBytes,
    })),
    upload: {
      uploadedCount: payload.uploadedCount,
      sftpBaseDir: payload.sftpBaseDir,
      sftpUploadedPaths: payload.sftpUploadedPaths,
      localRootFolder: payload.localRootFolder,
    },
  };

  const prevHistory = existing.uploadHistory;
  const history = Array.isArray(prevHistory) ? [...prevHistory] : [];
  history.unshift(record);
  const next = {
    ...existing,
    lastUpload: record,
    uploadHistory: history.slice(0, 100),
  };

  await writeFile(TEST_JSON_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
}

router.use((req: Request, _res: Response, next) => {
  const role = getUserRole(req);
  if (!ALLOWED_ROLES.has(role)) {
    next(
      new HttpError(403, "Forbidden: only admin/design can upload files", {
        code: "FORBIDDEN",
      }),
    );
    return;
  }
  next();
});

const DOWNLOAD_MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    await mkdir(FILE_UPLOAD_DIR, { recursive: true });
    const entries = await readdir(FILE_UPLOAD_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    res.json({ ok: true, files });
  }),
);

/** Tải một file phẳng trong uploads/file-center (query ?name=). */
router.get(
  "/file",
  asyncHandler(async (req: Request, res: Response) => {
    const raw = req.query.name as string | undefined;
    const safeName = path.basename(raw || "");
    if (!safeName || safeName === "." || safeName === "..") {
      throw new HttpError(400, "Invalid file name", { code: "BAD_REQUEST" });
    }
    const filePath = path.join(FILE_UPLOAD_DIR, safeName);
    let buf: Buffer;
    try {
      buf = await readFile(filePath);
    } catch {
      throw new HttpError(404, "File not found", { code: "NOT_FOUND" });
    }
    const ext = path.extname(safeName).toLowerCase();
    const mime = DOWNLOAD_MIME_BY_EXT[ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );
    res.send(buf);
  }),
);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      name?: string;
      content?: string;
      encoding?: "utf8" | "base64";
    };

    if (!body?.name || !body?.content) {
      throw new HttpError(400, "Missing 'name' or 'content'", {
        code: "BAD_REQUEST",
      });
    }

    await mkdir(FILE_UPLOAD_DIR, { recursive: true });

    const safeName = path.basename(body.name);
    if (!safeName) {
      throw new HttpError(400, "Invalid file name", { code: "BAD_REQUEST" });
    }

    const filePath = path.join(FILE_UPLOAD_DIR, safeName);
    const encoding = body.encoding === "base64" ? "base64" : "utf8";
    const payload = body.content;
    const buffer =
      encoding === "base64"
        ? Buffer.from(
            payload.includes(",") ? payload.split(",")[1] : payload,
            "base64",
          )
        : Buffer.from(payload, "utf8");

    if (isTooLarge(buffer)) {
      throw new HttpError(400, "Uploaded file exceeds 30MB limit", {
        code: "PAYLOAD_TOO_LARGE",
      });
    }

    let outBuffer: Buffer<ArrayBufferLike> = buffer;
    let videoMeta:
      | {
          originalBytes: number;
          compressedBytes: number;
          videoCompressed: boolean;
        }
      | undefined;
    if (isCompressibleVideoFilename(safeName)) {
      const compressed = await maybeCompressVideoUpload(buffer, safeName);
      outBuffer = compressed.buffer;
      videoMeta = {
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
        videoCompressed: compressed.videoCompressed,
      };
    }

    await writeFile(filePath, outBuffer);

    res.json({
      ok: true,
      name: safeName,
      path: filePath,
      storage: "file-center",
      ...(videoMeta ? { video: videoMeta } : {}),
    });
  }),
);

router.post(
  "/folder",
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      folderName?: string;
      demoId?: string;
      demoTitle?: string;
      categoryFilter?: string;
      overwrite?: boolean;
      files?: {
        relativePath?: string;
        content?: string;
        encoding?: "base64" | "utf8";
      }[];
    };

    if (
      !body?.folderName ||
      !Array.isArray(body.files) ||
      body.files.length === 0
    ) {
      throw new HttpError(400, "Missing 'folderName' or 'files' in body", {
        code: "BAD_REQUEST",
      });
    }
    const demoId = typeof body.demoId === "string" ? body.demoId.trim() : "";
    const demoTitleInput =
      typeof body.demoTitle === "string" ? body.demoTitle.trim() : "";
    if (!demoId && !demoTitleInput) {
      throw new HttpError(400, "Missing 'demoId' or 'demoTitle' in body", {
        code: "BAD_REQUEST",
      });
    }

    const demosRaw = await readFile(CREATIVE_DEMOS_PATH, "utf8");
    const demosParsed = JSON.parse(demosRaw) as {
      demos?: DemoRow[];
    };
    const demosList = demosParsed.demos || [];
    const matchedDemo = demoId
      ? demosList.find(
          (item) =>
            String(item?.id ?? "")
              .trim()
              .toLowerCase() === demoId.toLowerCase(),
        )
      : demosList.find(
          (item) =>
            String(item?.title || "")
              .trim()
              .toLowerCase() === demoTitleInput.toLowerCase(),
        );
    if (!matchedDemo) {
      throw new HttpError(400, "Demo not found in creative-demos.json", {
        code: "BAD_REQUEST",
      });
    }
    const idForSource = String(matchedDemo.id ?? "").trim();
    let source = String(matchedDemo.source || "").trim();
    if (!source) {
      source = defaultDemoSourceFromId(idForSource);
    }
    if (!source) {
      throw new HttpError(
        400,
        "Demo has no SFTP source path and no id to derive a default in creative-demos.json",
        { code: "BAD_REQUEST" },
      );
    }
    const sftpBaseDir = mapSourceToSftpRoot(source);
    const titleForZip = String(
      matchedDemo?.title || demoTitleInput || "",
    ).trim();
    const overwrite = body.overwrite === true;

    const safeFolderName = path.basename(body.folderName);
    if (!safeFolderName) {
      throw new HttpError(400, "Invalid folder name", { code: "BAD_REQUEST" });
    }

    const rootFolder = path.join(FILE_UPLOAD_DIR, safeFolderName);
    await mkdir(rootFolder, { recursive: true });

    const uploadedSftpPaths: string[] = [];
    const uploadedEntries: { relativePath: string; sizeBytes: number }[] = [];
    const checkedWritableDirs = new Set<string>();

    const parsedFiles: {
      relativePath: string;
      content: string;
      encoding: "base64" | "utf8";
    }[] = [];
    for (const file of body.files) {
      const relativePath = toSafeRelativePath(String(file.relativePath || ""));
      const content = typeof file.content === "string" ? file.content : "";
      const encoding = file.encoding === "utf8" ? "utf8" : "base64";

      if (!relativePath || !content) {
        throw new HttpError(
          400,
          "Each file needs valid 'relativePath' and 'content'",
          { code: "BAD_REQUEST" },
        );
      }
      if (!hasAllowedFolderExtension(relativePath)) {
        throw new HttpError(
          400,
          "Folder upload only accepts .fla or .psd files",
          { code: "BAD_REQUEST" },
        );
      }
      parsedFiles.push({ relativePath, content, encoding });
    }

    const decodedBuffers: { relativePath: string; buffer: Buffer }[] = [];
    for (const pf of parsedFiles) {
      const buffer =
        pf.encoding === "base64"
          ? Buffer.from(
              pf.content.includes(",") ? pf.content.split(",")[1] : pf.content,
              "base64",
            )
          : Buffer.from(pf.content, "utf8");
      if (isTooLarge(buffer)) {
        throw new HttpError(
          400,
          `Uploaded file '${pf.relativePath}' exceeds 30MB limit`,
          { code: "PAYLOAD_TOO_LARGE" },
        );
      }
      decodedBuffers.push({ relativePath: pf.relativePath, buffer });
    }

    const batchTotalBytes = decodedBuffers.reduce(
      (sum, x) => sum + x.buffer.length,
      0,
    );
    if (batchTotalBytes > MAX_FOLDER_BATCH_TOTAL_BYTES) {
      throw new HttpError(
        400,
        `Total upload size exceeds 30MB limit (${batchTotalBytes} bytes)`,
        { code: "PAYLOAD_TOO_LARGE" },
      );
    }

    const remoteTargetPaths = decodedBuffers.map((d) =>
      `${sftpBaseDir}/${d.relativePath}`.replace(/\/{2,}/g, "/"),
    );
    if (!overwrite) {
      const existingPaths: string[] = [];
      const uniqueTargets = Array.from(new Set(remoteTargetPaths));
      for (const targetPath of uniqueTargets) {
        const existsInfo = await sftpPathExists(
          targetPath,
          {},
          {
            scope: "demo",
          },
        );
        if (existsInfo.exists) {
          existingPaths.push(existsInfo.checkedPath || targetPath);
        }
      }
      if (existingPaths.length > 0) {
        throw new HttpError(409, "Remote file already exists on SFTP", {
          code: "CONFLICT",
          details: { conflict: true, existingPaths },
        });
      }
    }

    for (let i = 0; i < decodedBuffers.length; i++) {
      const { relativePath, buffer } = decodedBuffers[i];
      const targetPath = path.join(rootFolder, relativePath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, buffer);
      uploadedEntries.push({
        relativePath,
        sizeBytes: buffer.length,
      });
      const remotePath = remoteTargetPaths[i];
      const remoteDir = path.posix.dirname(remotePath);
      if (!checkedWritableDirs.has(remoteDir)) {
        await verifySftpWritableDirectory(remoteDir);
        checkedWritableDirs.add(remoteDir);
      }
      await uploadSftpBuffer(remotePath, buffer);
      uploadedSftpPaths.push(remotePath);
    }

    const categoryFilter =
      typeof body.categoryFilter === "string" ? body.categoryFilter.trim() : "";
    let testJsonUpdated = false;
    try {
      await recordFolderUploadToTestJson({
        categoryFilter,
        demoTitle: titleForZip,
        folderName: safeFolderName,
        uploadedEntries,
        demo: matchedDemo,
        source,
        sftpBaseDir,
        uploadedCount: body.files.length,
        localRootFolder: rootFolder,
        sftpUploadedPaths: uploadedSftpPaths,
      });
      testJsonUpdated = true;
    } catch (err) {
      console.error("recordFolderUploadToTestJson failed", err);
    }
    let creativeDemosUpdated = false;
    try {
      if (matchedDemo && matchedDemo.fla !== true) {
        matchedDemo.fla = true;
        await writeFile(
          CREATIVE_DEMOS_PATH,
          JSON.stringify(demosParsed, null, 2) + "\n",
          "utf8",
        );
        creativeDemosUpdated = true;
      }
    } catch (err) {
      console.error("update creative-demos fla failed", err);
    }

    res.json({
      ok: true,
      folderName: safeFolderName,
      demoTitle: titleForZip,
      source,
      sftpBaseDir,
      uploaded: body.files.length,
      path: rootFolder,
      sftpUploadedPaths: uploadedSftpPaths,
      storage: "file-center",
      testJsonUpdated,
      creativeDemosUpdated,
    });
  }),
);

export const fileUploadRouter = router;
