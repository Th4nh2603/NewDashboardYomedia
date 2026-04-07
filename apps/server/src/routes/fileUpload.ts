import { Router, Request, Response } from "express";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  uploadSftpBuffer,
  sftpPathExists,
  verifySftpWritableDirectory,
} from "../lib/sftpClient.js";

const router = Router();
const FILE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "file-center");
const ALLOWED_ROLES = new Set(["admin", "design"]);
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREATIVE_DEMOS_PATH = path.join(
  __dirname,
  "..",
  "data",
  "creative-demos.json",
);
const TEST_JSON_PATH = path.join(__dirname, "..", "data", "test.json");

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

function toSafeZipBaseName(title: string): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return normalized || "creative-demo";
}

/** If source is blank in creative-demos.json, use the same layout as populated rows. */
function defaultDemoSourceFromId(demoId: string): string {
  const id = demoId.trim();
  if (!id) return "";
  return `yomedia/app/template/data/${id}/banner`;
}

function getUserRole(req: Request): string {
  const headerRole = req.header("x-user-role");
  if (typeof headerRole === "string" && headerRole.trim()) {
    return headerRole.trim().toLowerCase();
  }

  const bodyRole =
    typeof req.body?.role === "string" ? req.body.role : undefined;
  if (bodyRole?.trim()) {
    return bodyRole.trim().toLowerCase();
  }

  return "";
}

function isTooLarge(buffer: Buffer): boolean {
  return buffer.length > MAX_UPLOAD_SIZE_BYTES;
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
  zipEntries: { relativePath: string; sizeBytes: number }[];
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
    files: payload.zipEntries.map((z, i) => ({
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
  const history = Array.isArray(prevHistory)
    ? [...prevHistory]
    : [];
  history.unshift(record);
  const next = {
    ...existing,
    lastUpload: record,
    uploadHistory: history.slice(0, 100),
  };

  await writeFile(
    TEST_JSON_PATH,
    JSON.stringify(next, null, 2) + "\n",
    "utf8",
  );
}

router.use((req: Request, res: Response, next) => {
  const role = getUserRole(req);
  if (!ALLOWED_ROLES.has(role)) {
    res.status(403).json({
      ok: false,
      error: "Forbidden: only admin/design can upload files",
    });
    return;
  }
  next();
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    await mkdir(FILE_UPLOAD_DIR, { recursive: true });
    const entries = await readdir(FILE_UPLOAD_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    res.json({ ok: true, files });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "List files failed";
    res.status(500).json({ ok: false, error: message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name?: string;
      content?: string;
      encoding?: "utf8" | "base64";
    };

    if (!body?.name || !body?.content) {
      res.status(400).json({ ok: false, error: "Missing 'name' or 'content'" });
      return;
    }

    await mkdir(FILE_UPLOAD_DIR, { recursive: true });

    const safeName = path.basename(body.name);
    if (!safeName) {
      res.status(400).json({ ok: false, error: "Invalid file name" });
      return;
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
      res
        .status(400)
        .json({ ok: false, error: "Uploaded file exceeds 5MB limit" });
      return;
    }

    await writeFile(filePath, buffer);

    res.json({
      ok: true,
      name: safeName,
      path: filePath,
      storage: "file-center",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ ok: false, error: message });
  }
});

router.post("/folder", async (req: Request, res: Response) => {
  try {
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
      res.status(400).json({
        ok: false,
        error: "Missing 'folderName' or 'files' in body",
      });
      return;
    }
    const demoId = typeof body.demoId === "string" ? body.demoId.trim() : "";
    const demoTitleInput =
      typeof body.demoTitle === "string" ? body.demoTitle.trim() : "";
    if (!demoId && !demoTitleInput) {
      res
        .status(400)
        .json({ ok: false, error: "Missing 'demoId' or 'demoTitle' in body" });
      return;
    }

    const demosRaw = await readFile(CREATIVE_DEMOS_PATH, "utf8");
    const demosParsed = JSON.parse(demosRaw) as {
      demos?: DemoRow[];
    };
    const demosList = demosParsed.demos || [];
    const matchedDemo = demoId
      ? demosList.find(
          (item) =>
            String(item?.id ?? "").trim().toLowerCase() ===
            demoId.toLowerCase(),
        )
      : demosList.find(
          (item) =>
            String(item?.title || "")
              .trim()
              .toLowerCase() === demoTitleInput.toLowerCase(),
        );
    if (!matchedDemo) {
      res.status(400).json({
        ok: false,
        error: "Demo not found in creative-demos.json",
      });
      return;
    }
    const idForSource = String(matchedDemo.id ?? "").trim();
    let source = String(matchedDemo.source || "").trim();
    if (!source) {
      source = defaultDemoSourceFromId(idForSource);
    }
    if (!source) {
      res.status(400).json({
        ok: false,
        error:
          "Demo has no SFTP source path and no id to derive a default in creative-demos.json",
      });
      return;
    }
    const sftpBaseDir = mapSourceToSftpRoot(source);
    const titleForZip =
      String(matchedDemo?.title || demoTitleInput || "").trim();
    const zipBaseName = toSafeZipBaseName(titleForZip);
    const overwrite = body.overwrite === true;

    const safeFolderName = path.basename(body.folderName);
    if (!safeFolderName) {
      res.status(400).json({ ok: false, error: "Invalid folder name" });
      return;
    }

    const rootFolder = path.join(FILE_UPLOAD_DIR, safeFolderName);
    await mkdir(rootFolder, { recursive: true });

    const uploadedSftpPaths: string[] = [];
    const zipEntries: { relativePath: string; sizeBytes: number }[] = [];
    const checkedWritableDirs = new Set<string>();
    const remoteTargetPaths = body.files.map((_, i) => {
      const targetZipName =
        body.files!.length > 1 ? `${zipBaseName}-${i + 1}.zip` : `${zipBaseName}.zip`;
      return `${sftpBaseDir}/${targetZipName}`.replace(/\/{2,}/g, "/");
    });
    if (!overwrite) {
      const existingPaths: string[] = [];
      const uniqueTargets = Array.from(new Set(remoteTargetPaths));
      for (const targetPath of uniqueTargets) {
        const existsInfo = await sftpPathExists(targetPath, {}, { scope: "demo" });
        if (existsInfo.exists) {
          existingPaths.push(existsInfo.checkedPath || targetPath);
        }
      }
      if (existingPaths.length > 0) {
        res.status(409).json({
          ok: false,
          conflict: true,
          error: "Remote file already exists on SFTP",
          existingPaths,
        });
        return;
      }
    }

    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];
      const relativePath = toSafeRelativePath(String(file.relativePath || ""));
      const content = typeof file.content === "string" ? file.content : "";
      const encoding = file.encoding === "utf8" ? "utf8" : "base64";
      const isZip = relativePath?.toLowerCase().endsWith(".zip");

      if (!relativePath || !content) {
        res.status(400).json({
          ok: false,
          error: "Each file needs valid 'relativePath' and 'content'",
        });
        return;
      }
      if (!isZip) {
        res.status(400).json({
          ok: false,
          error: "Folder upload only accepts .zip files",
        });
        return;
      }

      const targetPath = path.join(rootFolder, relativePath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      const buffer =
        encoding === "base64"
          ? Buffer.from(
              content.includes(",") ? content.split(",")[1] : content,
              "base64",
            )
          : Buffer.from(content, "utf8");
      if (isTooLarge(buffer)) {
        res.status(400).json({
          ok: false,
          error: `Uploaded file '${relativePath}' exceeds 5MB limit`,
        });
        return;
      }
      await writeFile(targetPath, buffer);
      zipEntries.push({
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
        zipEntries,
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Folder upload failed";
    res.status(500).json({ ok: false, error: message });
  }
});

export const fileUploadRouter = router;
