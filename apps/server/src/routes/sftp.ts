import { Router, Request, Response } from "express";
import {
  testSftpConnection,
  listSftpDirectory,
  readSftpFile,
  sftpPathExists,
  writeSftpFile,
} from "../lib/sftpClient.js";

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
    const path = (req.query.path as string) ?? "/";
    const entries = await listSftpDirectory(path);
    res.json({ ok: true, path, entries });
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
    if (!path) {
      res.status(400).json({ ok: false, error: "Missing 'path' query parameter" });
      return;
    }

    const result = await sftpPathExists(path);
    res.json({ ok: true, path, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});

sftpRouter.post("/write", async (req: Request, res: Response) => {
  try {
    const body = req.body as { path?: string; content?: string };
    if (!body?.path) {
      res.status(400).json({ ok: false, error: "Missing 'path' field in body" });
      return;
    }
    await writeSftpFile(body.path, body.content ?? "");
    res.json({ ok: true, path: body.path });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown SFTP error";
    res.status(500).json({ ok: false, error: message });
  }
});
