import { Router, Request, Response } from "express";
import { asyncHandler, HttpError } from "../lib/httpErrors.js";
import { getUserRole } from "../lib/authRole.js";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  testSftpConnection,
  listSftpDirectory,
  searchSftpDirectoryTree,
  mapSftpDirectoryTree,
  type SftpDirTreeNode,
  readSftpFile,
  sftpPathExists,
  writeSftpFile,
  deleteSftpPath,
  uploadSftpBuffer,
  downloadSftpDirectoryAsZip,
} from "../lib/sftpClient.js";
import {
  isCompressibleVideoFilename,
  maybeCompressVideoUpload,
} from "../lib/videoCompress.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SFTP_DIR_MAP_JSON_PATH = path.join(__dirname, "..", "data", "test.json");

function flattenDirPaths(node: SftpDirTreeNode): string[] {
  const out: string[] = [node.path];
  for (const c of node.children) {
    out.push(...flattenDirPaths(c));
  }
  return out;
}

export const sftpRouter = Router();

function requireAdminRole(req: Request): void {
  const role = getUserRole(req);
  if (role !== "admin") {
    throw new HttpError(
      403,
      "Forbidden: only admin can edit/delete SFTP files",
    );
  }
}

sftpRouter.post(
  "/connect",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
    const result = await testSftpConnection({
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
    });
    res.json(result);
  }),
);

sftpRouter.get(
  "/connect",
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await testSftpConnection({});
    res.json(result);
  }),
);

sftpRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const pathParam = (req.query.path as string) ?? "/";
    const entries = await listSftpDirectory(pathParam);
    res.json({ ok: true, path: pathParam, entries });
  }),
);

/**
 * Kết nối SFTP, duyệt toàn bộ cây thư mục (giới hạn maxDepth / maxNodes)
 * và ghi vào apps/server/src/data/test.json .
 */
sftpRouter.post(
  "/sync-directory-map-to-test-json",
  asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      path?: string;
      maxDepth?: number;
      maxNodes?: number;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
    const rootPath = typeof body.path === "string" ? body.path : "/";
    const maxDepth =
      typeof body.maxDepth === "number" && Number.isFinite(body.maxDepth)
        ? body.maxDepth
        : undefined;
    const maxNodes =
      typeof body.maxNodes === "number" && Number.isFinite(body.maxNodes)
        ? body.maxNodes
        : undefined;

    const payload = await mapSftpDirectoryTree(rootPath, {
      maxDepth,
      maxNodes,
      config: {
        host: body.host,
        port: body.port,
        username: body.username,
        password: body.password,
      },
    });

    const directories = flattenDirPaths(payload.tree).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

    const fileBody = {
      ...payload,
      directories,
    };

    const json = `${JSON.stringify(fileBody, null, 2)}\n`;
    await writeFile(SFTP_DIR_MAP_JSON_PATH, json, "utf8");

    res.json({
      ok: true,
      writtenTo: SFTP_DIR_MAP_JSON_PATH,
      directoryCount: payload.directoryCount,
      sftpRoot: payload.sftpRoot,
    });
  }),
);

/** Giống POST sync; query: path, maxDepth, maxNodes (tiện cho curl/browser). */
sftpRouter.get(
  "/sync-directory-map-to-test-json",
  asyncHandler(async (req: Request, res: Response) => {
    const rootPath = typeof req.query.path === "string" ? req.query.path : "/";
    const maxDepthRaw = parseInt(String(req.query.maxDepth ?? ""), 10);
    const maxNodesRaw = parseInt(String(req.query.maxNodes ?? ""), 10);
    const maxDepth = Number.isFinite(maxDepthRaw) ? maxDepthRaw : undefined;
    const maxNodes = Number.isFinite(maxNodesRaw) ? maxNodesRaw : undefined;

    const payload = await mapSftpDirectoryTree(rootPath, {
      maxDepth,
      maxNodes,
    });

    const directories = flattenDirPaths(payload.tree).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

    const fileBody = {
      ...payload,
      directories,
    };

    const json = `${JSON.stringify(fileBody, null, 2)}\n`;
    await writeFile(SFTP_DIR_MAP_JSON_PATH, json, "utf8");

    res.json({
      ok: true,
      writtenTo: SFTP_DIR_MAP_JSON_PATH,
      directoryCount: payload.directoryCount,
      sftpRoot: payload.sftpRoot,
    });
  }),
);

/** DFS: thư mục con có tên hoặc đường dẫn tương đối (từ `path`) chứa `q`. */
sftpRouter.get(
  "/search-directories",
  asyncHandler(async (req: Request, res: Response) => {
    const rootPath = (req.query.path as string) ?? "/script/demo";
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const maxDepthRaw = parseInt(String(req.query.maxDepth ?? ""), 10);
    const limitRaw = parseInt(String(req.query.limit ?? ""), 10);
    const maxDepth = Number.isFinite(maxDepthRaw)
      ? Math.min(24, Math.max(1, maxDepthRaw))
      : 14;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(500, Math.max(1, limitRaw))
      : 250;

    if (!q.trim()) {
      res.json({
        ok: true,
        path: rootPath,
        query: "",
        matches: [] as {
          fullPath: string;
          relativePath: string;
          matchedName: string;
        }[],
      });
      return;
    }

    const matches = await searchSftpDirectoryTree(rootPath, q, {
      maxDepth,
      limit,
    });
    res.json({ ok: true, path: rootPath, query: q.trim(), matches });
  }),
);

sftpRouter.get(
  "/read",
  asyncHandler(async (req: Request, res: Response) => {
    const filePath = req.query.path as string | undefined;
    if (!filePath) {
      throw new HttpError(400, "Missing 'path' query parameter", {
        code: "BAD_REQUEST",
      });
    }
    const content = await readSftpFile(filePath);
    res.json({ ok: true, path: filePath, content });
  }),
);

sftpRouter.get(
  "/exists",
  asyncHandler(async (req: Request, res: Response) => {
    const filePath = req.query.path as string | undefined;
    const scope =
      (req.query.scope as string | undefined) === "demo" ? "demo" : "media";
    if (!filePath) {
      throw new HttpError(400, "Missing 'path' query parameter", {
        code: "BAD_REQUEST",
      });
    }

    const result = await sftpPathExists(filePath, {}, { scope });
    res.json({ ok: true, path: filePath, ...result });
  }),
);

sftpRouter.post(
  "/write",
  asyncHandler(async (req: Request, res: Response) => {
    requireAdminRole(req);
    const body = req.body as {
      path?: string;
      content?: string;
      encoding?: "utf8" | "base64";
    };
    if (!body?.path) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }
    if (body.encoding === "base64") {
      const raw = String(body.content ?? "");
      const normalized = raw.includes(",") ? raw.split(",")[1] : raw;
      let buffer = Buffer.from(normalized, "base64");
      const base = path.basename(body.path || "");
      let videoMeta:
        | {
            originalBytes: number;
            compressedBytes: number;
            videoCompressed: boolean;
          }
        | undefined;
      if (base && isCompressibleVideoFilename(base)) {
        const compressed = await maybeCompressVideoUpload(buffer, base);
        buffer = compressed.buffer;
        videoMeta = {
          originalBytes: compressed.originalBytes,
          compressedBytes: compressed.compressedBytes,
          videoCompressed: compressed.videoCompressed,
        };
      }
      await uploadSftpBuffer(body.path, buffer);
      res.json({
        ok: true,
        path: body.path,
        ...(videoMeta ? { video: videoMeta } : {}),
      });
      return;
    }
    await writeSftpFile(body.path, body.content ?? "");
    res.json({ ok: true, path: body.path });
  }),
);

sftpRouter.post(
  "/delete",
  asyncHandler(async (req: Request, res: Response) => {
    requireAdminRole(req);
    const body = req.body as { path?: string };
    if (!body?.path) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }
    const result = await deleteSftpPath(body.path);
    res.json(result);
  }),
);

sftpRouter.get(
  "/download-directory",
  asyncHandler(async (req: Request, res: Response) => {
    const dirPath = req.query.path as string | undefined;
    if (!dirPath) {
      throw new HttpError(400, "Missing 'path' query parameter", {
        code: "BAD_REQUEST",
      });
    }

    const { zipBuffer, zipName } = await downloadSftpDirectoryAsZip(dirPath);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  }),
);
