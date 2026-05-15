import express, { Router, Request, Response } from "express";
import { asyncHandler, HttpError } from "../lib/http/errors.js";
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
  createSftpDirectory,
  uploadSftpBuffer,
  renameSftpPath,
  downloadSftpDirectoryAsZip,
  copySftpPathBetweenConfigs,
  configForManageSftpScope,
  mapRemotePathForManageScope,
  type ManageSftpScope,
} from "../lib/sftp/index.js";
import {
  isCompressibleVideoFilename,
  maybeCompressVideoUpload,
} from "../lib/media/videoCompress.js";
import {
  isBuildDemoMediaSetupAllowed,
  isManageDemoMediaSftpAllowed,
} from "../lib/auth/manageDemoMediaSftp.js";
import { assertCreativeShowcaseDownloadAllowed } from "../lib/auth/creativeShowcaseDownload.js";
import {
  assertSftpDeleteAllowed,
  assertSftpMkdirAllowed,
  assertSftpRenameAllowed,
  assertSftpUploadBinaryAllowed,
  assertSftpWriteFileAllowed,
} from "../lib/auth/sftpMutate.js";

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

/** `scope=media` uses SFTP_*_MEDIA; omit or other ⇒ demo SFTP_* / defaults. POST bodies may include `scope`. */
function parseManageSftpScope(req: Request): ManageSftpScope {
  const fromQuery =
    typeof req.query.scope === "string"
      ? req.query.scope.trim().toLowerCase()
      : "";
  const bodyRaw = req.body as { scope?: string } | undefined;
  const fromBody =
    typeof bodyRaw?.scope === "string"
      ? bodyRaw.scope.trim().toLowerCase()
      : "";
  const raw = fromBody || fromQuery;
  return raw === "media" ? "media" : "demo";
}

function assertMediaManageSftpAllowed(req: Request, scope: ManageSftpScope) {
  if (scope !== "media") return;
  if (!isManageDemoMediaSftpAllowed(req)) {
    throw new HttpError(
      403,
      "Forbidden: media SFTP requires admin role and canSwitchSftpHost permission.",
      { code: "FORBIDDEN_MEDIA_SFTP" },
    );
  }
}

function assertBuildDemoMediaSetupAllowed(req: Request) {
  if (isBuildDemoMediaSetupAllowed(req)) return;
  throw new HttpError(403, "Forbidden: setup to media requires permission.", {
    code: "FORBIDDEN_MEDIA_SETUP",
  });
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
  asyncHandler(async (req: Request, res: Response) => {
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const result = await testSftpConnection(cfg);
    res.json(result);
  }),
);

sftpRouter.get(
  "/list",
  asyncHandler(async (req: Request, res: Response) => {
    const pathParam = (req.query.path as string) ?? "/";
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remotePath = mapRemotePathForManageScope(pathParam, scope);
    const entries = await listSftpDirectory(remotePath, cfg);
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

    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const remoteRoot = mapRemotePathForManageScope(rootPath, scope);
    const matches = await searchSftpDirectoryTree(remoteRoot, q, {
      maxDepth,
      limit,
      config: configForManageSftpScope(scope),
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
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remotePath = mapRemotePathForManageScope(filePath, scope);
    const content = await readSftpFile(remotePath, cfg);
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
  "/write-binary",
  express.raw({ type: "application/octet-stream", limit: "500mb" }),
  asyncHandler(async (req: Request, res: Response) => {
    assertSftpUploadBinaryAllowed(req);
    const targetPath = typeof req.query.path === "string" ? req.query.path : "";
    if (!targetPath) {
      throw new HttpError(400, "Missing 'path' query parameter", {
        code: "BAD_REQUEST",
      });
    }

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new HttpError(400, "Missing binary body", {
        code: "BAD_REQUEST",
      });
    }

    let buffer = Buffer.from(rawBody);
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remoteTargetPath = mapRemotePathForManageScope(targetPath, scope);
    const base = path.basename(targetPath);
    let videoMeta:
      | {
          originalBytes: number;
          compressedBytes: number;
          videoCompressed: boolean;
        }
      | undefined;

    if (base && isCompressibleVideoFilename(base)) {
      const compressed = await maybeCompressVideoUpload(buffer, base);
      buffer = Buffer.from(compressed.buffer);
      videoMeta = {
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
        videoCompressed: compressed.videoCompressed,
      };
    }

    await uploadSftpBuffer(remoteTargetPath, buffer, cfg);
    res.json({
      ok: true,
      path: targetPath,
      ...(videoMeta ? { video: videoMeta } : {}),
    });
  }),
);

sftpRouter.post(
  "/write",
  asyncHandler(async (req: Request, res: Response) => {
    assertSftpWriteFileAllowed(req);
    const body = req.body as {
      path?: string;
      content?: string;
      encoding?: "utf8" | "base64";
      scope?: string;
    };
    if (!body?.path) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remoteWritePath = mapRemotePathForManageScope(body.path, scope);
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
        buffer = Buffer.from(compressed.buffer);
        videoMeta = {
          originalBytes: compressed.originalBytes,
          compressedBytes: compressed.compressedBytes,
          videoCompressed: compressed.videoCompressed,
        };
      }
      await uploadSftpBuffer(remoteWritePath, buffer, cfg);
      res.json({
        ok: true,
        path: body.path,
        ...(videoMeta ? { video: videoMeta } : {}),
      });
      return;
    }
    await writeSftpFile(remoteWritePath, body.content ?? "", cfg);
    res.json({ ok: true, path: body.path });
  }),
);

sftpRouter.post(
  "/rename",
  asyncHandler(async (req: Request, res: Response) => {
    assertSftpRenameAllowed(req);
    const body = req.body as {
      oldPath?: string;
      newPath?: string;
      scope?: string;
    };
    if (!body?.oldPath || !body?.newPath) {
      throw new HttpError(400, "Missing 'oldPath' or 'newPath' field in body", {
        code: "BAD_REQUEST",
      });
    }
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remoteOld = mapRemotePathForManageScope(body.oldPath, scope);
    const remoteNew = mapRemotePathForManageScope(body.newPath, scope);
    const result = await renameSftpPath(remoteOld, remoteNew, cfg);
    res.json({
      ...result,
      oldPath: body.oldPath,
      newPath: body.newPath,
    });
  }),
);

sftpRouter.post(
  "/mkdir",
  asyncHandler(async (req: Request, res: Response) => {
    assertSftpMkdirAllowed(req);
    const body = req.body as { path?: string; scope?: string };
    if (!body?.path) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remotePath = mapRemotePathForManageScope(body.path, scope);
    const result = await createSftpDirectory(remotePath, cfg);
    res.json({ ...result, path: body.path });
  }),
);

sftpRouter.post(
  "/setup-demo-media",
  asyncHandler(async (req: Request, res: Response) => {
    assertBuildDemoMediaSetupAllowed(req);

    const body = req.body as { path?: string };
    const logicalPath = typeof body?.path === "string" ? body.path.trim() : "";
    if (!logicalPath) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }

    const sourcePath = mapRemotePathForManageScope(logicalPath, "demo");
    const targetPath = mapRemotePathForManageScope(logicalPath, "media");

    const result = await copySftpPathBetweenConfigs(sourcePath, targetPath, {
      sourceConfig: configForManageSftpScope("demo"),
      targetConfig: configForManageSftpScope("media"),
    });

    res.json({
      ok: true,
      logicalPath,
      ...result,
    });
  }),
);

sftpRouter.post(
  "/delete",
  asyncHandler(async (req: Request, res: Response) => {
    assertSftpDeleteAllowed(req);
    const body = req.body as { path?: string; scope?: string };
    if (!body?.path) {
      throw new HttpError(400, "Missing 'path' field in body", {
        code: "BAD_REQUEST",
      });
    }
    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remotePath = mapRemotePathForManageScope(body.path, scope);
    const result = await deleteSftpPath(remotePath, cfg);
    res.json({ ...result, path: body.path });
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

    assertCreativeShowcaseDownloadAllowed(req);

    const scope = parseManageSftpScope(req);
    assertMediaManageSftpAllowed(req, scope);
    const cfg = configForManageSftpScope(scope);
    const remoteDir = mapRemotePathForManageScope(dirPath, scope);
    const { zipBuffer, zipName } = await downloadSftpDirectoryAsZip(
      remoteDir,
      cfg,
    );
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  }),
);
