import { Router, Request, Response } from "express";
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
  uploadSftpBuffer,
  downloadSftpDirectoryAsZip,
} from "../lib/sftpClient.js";

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

sftpRouter.post("/connect", async (req: Request, res: Response) => {
  try {
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.get("/connect", async (_req: Request, res: Response) => {
  try {
    const result = await testSftpConnection({});
    res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.get("/list", async (req: Request, res: Response) => {
  try {
    const pathParam = (req.query.path as string) ?? "/";
    const entries = await listSftpDirectory(pathParam);
    res.json({ ok: true, path: pathParam, entries });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

/**
 * Kết nối SFTP, duyệt toàn bộ cây thư mục (giới hạn maxDepth / maxNodes)
 * và ghi vào apps/server/src/data/test.json .
 */
sftpRouter.post("/sync-directory-map-to-test-json", async (req: Request, res: Response) => {
  try {
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

/** Giống POST sync; query: path, maxDepth, maxNodes (tiện cho curl/browser). */
sftpRouter.get("/sync-directory-map-to-test-json", async (req: Request, res: Response) => {
  try {
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

/** DFS: thư mục con có tên hoặc đường dẫn tương đối (từ `path`) chứa `q`. */
sftpRouter.get("/search-directories", async (req: Request, res: Response) => {
  try {
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
        matches: [] as { fullPath: string; relativePath: string; matchedName: string }[],
      });
      return;
    }

    const matches = await searchSftpDirectoryTree(rootPath, q, {
      maxDepth,
      limit,
    });
    res.json({ ok: true, path: rootPath, query: q.trim(), matches });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.get("/read", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string | undefined;
    if (!path) {
      res.status(400).json({ ok: false, error: "Missing 'path' query parameter" });
      return;
    }
    const content = await readSftpFile(path);
    res.json({ ok: true, path, content });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.get("/exists", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string | undefined;
    const scope = (req.query.scope as string | undefined) === "demo" ? "demo" : "media";
    if (!path) {
      res.status(400).json({ ok: false, error: "Missing 'path' query parameter" });
      return;
    }

    const result = await sftpPathExists(path, {}, { scope });
    res.json({ ok: true, path, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.post("/write", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      path?: string;
      content?: string;
      encoding?: "utf8" | "base64";
    };
    if (!body?.path) {
      res.status(400).json({ ok: false, error: "Missing 'path' field in body" });
      return;
    }
    if (body.encoding === "base64") {
      const raw = String(body.content ?? "");
      const normalized = raw.includes(",") ? raw.split(",")[1] : raw;
      const buffer = Buffer.from(normalized, "base64");
      await uploadSftpBuffer(body.path, buffer);
    } else {
      await writeSftpFile(body.path, body.content ?? "");
    }
    res.json({ ok: true, path: body.path });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.get("/download-directory", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string | undefined;
    if (!path) {
      res.status(400).json({ ok: false, error: "Missing 'path' query parameter" });
      return;
    }

    const { zipBuffer, zipName } = await downloadSftpDirectoryAsZip(path);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.send(zipBuffer);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});
