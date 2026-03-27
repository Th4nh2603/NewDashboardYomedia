import { Router, Request, Response } from "express";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  uploadSftpBuffer,
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
      demoTitle?: string;
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
    if (!body.demoTitle?.trim()) {
      res.status(400).json({ ok: false, error: "Missing 'demoTitle' in body" });
      return;
    }

    const demosRaw = await readFile(CREATIVE_DEMOS_PATH, "utf8");
    const demosParsed = JSON.parse(demosRaw) as {
      demos?: { title?: string; source?: string }[];
    };
    const matchedDemo = (demosParsed.demos || []).find(
      (item) =>
        String(item?.title || "")
          .trim()
          .toLowerCase() === body.demoTitle!.trim().toLowerCase(),
    );
    const source = String(matchedDemo?.source || "").trim();
    if (!source) {
      res.status(400).json({
        ok: false,
        error: "Demo title not found or missing source in creative-demos.json",
      });
      return;
    }
    const sftpBaseDir = mapSourceToSftpRoot(source);
    const zipBaseName = toSafeZipBaseName(body.demoTitle.trim());

    const safeFolderName = path.basename(body.folderName);
    if (!safeFolderName) {
      res.status(400).json({ ok: false, error: "Invalid folder name" });
      return;
    }

    const rootFolder = path.join(FILE_UPLOAD_DIR, safeFolderName);
    await mkdir(rootFolder, { recursive: true });

    const uploadedSftpPaths: string[] = [];
    const checkedWritableDirs = new Set<string>();
    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];
      const relativePath = toSafeRelativePath(String(file.relativePath || ""));
      const content = typeof file.content === "string" ? file.content : "";
      const encoding = file.encoding === "utf8" ? "utf8" : "base64";
      const isZip = relativePath?.toLowerCase().endsWith(".zip");
      const targetZipName =
        body.files.length > 1
          ? `${zipBaseName}-${i + 1}.zip`
          : `${zipBaseName}.zip`;

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
      const remotePath = `${sftpBaseDir}/${targetZipName}`.replace(
        /\/{2,}/g,
        "/",
      );
      const remoteDir = path.posix.dirname(remotePath);
      if (!checkedWritableDirs.has(remoteDir)) {
        await verifySftpWritableDirectory(remoteDir);
        checkedWritableDirs.add(remoteDir);
      }
      await uploadSftpBuffer(remotePath, buffer);
      uploadedSftpPaths.push(remotePath);
    }

    res.json({
      ok: true,
      folderName: safeFolderName,
      demoTitle: body.demoTitle.trim(),
      source,
      sftpBaseDir,
      uploaded: body.files.length,
      path: rootFolder,
      sftpUploadedPaths: uploadedSftpPaths,
      storage: "file-center",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Folder upload failed";
    res.status(500).json({ ok: false, error: message });
  }
});

export const fileUploadRouter = router;
