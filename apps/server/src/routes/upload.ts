import { Router, Request, Response } from "express";
import { writeFile, mkdir, readFile, readdir, unlink } from "fs/promises";
import path from "path";

const router = Router();
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const HTML_JS_EXT = [".html", ".htm", ".js", ".mjs", ".cjs"];
const JS_EXT = [".js", ".mjs", ".cjs"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function isHtmlOrJs(filename: string): boolean {
  return HTML_JS_EXT.includes(path.extname(filename).toLowerCase());
}

function isJsFile(filename: string): boolean {
  return JS_EXT.includes(path.extname(filename).toLowerCase());
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXT.includes(path.extname(filename).toLowerCase());
}

/** GET ?name=file.html → read one file. GET (no name) → list HTML/JS files. */
router.get("/", async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string | undefined;
    await mkdir(UPLOAD_DIR, { recursive: true });

    if (name) {
      const safeName = path.basename(name);
      if (!safeName) {
        res
          .status(400)
          .json({ ok: false, error: "Missing or invalid 'name' query parameter" });
        return;
      }
      const filePath = path.join(UPLOAD_DIR, safeName);
      let content = await readFile(filePath, "utf8");

      const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
      const images = await Promise.all(
        entries
          .filter((e) => e.isFile() && isImageFile(e.name))
          .map(async (e) => {
            const imgPath = path.join(UPLOAD_DIR, e.name);
            const buffer = await readFile(imgPath);
            const ext = path.extname(e.name).toLowerCase();
            const mime = IMAGE_MIME_BY_EXT[ext] ?? "application/octet-stream";
            return { name: e.name, mime, base64: buffer.toString("base64") };
          }),
      );

      let imageLineIndexes: { name: string; lineIndex: number }[] = [];
      if (isJsFile(safeName) && images.length > 0) {
        const lines = content.split(/\r?\n/);
        for (const img of images) {
          const dataUrl = `data:image/webp;base64,${img.base64}`;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.includes(img.name)) continue;
            const idx = line.indexOf(img.name);
            if (idx === -1) continue;
            const afterNameIndex = idx + img.name.length;
            const nextQuoteIndex = line.indexOf('"', afterNameIndex);
            const suffix =
              nextQuoteIndex === -1
                ? line.slice(afterNameIndex)
                : line.slice(nextQuoteIndex);
            const suffixAfterQuote = suffix.startsWith('"') ? suffix.slice(1) : suffix;
            lines[i] =
              `{type:createjs.Types.IMAGE, src:"${dataUrl}"${suffixAfterQuote}`;
            imageLineIndexes.push({ name: img.name, lineIndex: i });
            break;
          }
        }
        content = lines.join("\n");
      }

      const convertedImages = imageLineIndexes
        .filter((item) => item.lineIndex >= 0)
        .map((item) => item.name);

      res.json({
        ok: true,
        name: safeName,
        content,
        images,
        imageLineIndexes,
        convertedImages,
      });
      return;
    }

    const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && isHtmlOrJs(e.name))
      .map((e) => e.name)
      .sort();
    res.json({ ok: true, files });
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      res.status(404).json({ ok: false, error: "File not found" });
      return;
    }
    const message = error instanceof Error ? error.message : "Read failed";
    res.status(500).json({ ok: false, error: message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name?: string;
      content?: string;
      images?: { name: string; base64: string }[];
    };
    if (!body?.name || body.content === undefined) {
      res
        .status(400)
        .json({ ok: false, error: "Missing 'name' or 'content' in body" });
      return;
    }
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    const safeName = path.basename(body.name) || "upload.txt";
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, body.content, "utf8");

    if (Array.isArray(body.images) && body.images.length > 0) {
      await Promise.all(
        body.images.map(async (img) => {
          const raw = img.base64.includes(",")
            ? img.base64.split(",")[1]
            : img.base64;
          const buffer = Buffer.from(raw, "base64");
          const imgName = path.basename(img.name || "image.png");
          await writeFile(path.join(uploadDir, imgName), buffer);
        }),
      );
    }
    res.json({ ok: true, name: safeName, path: filePath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ ok: false, error: message });
  }
});

router.delete("/", async (_req: Request, res: Response) => {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map((e) => unlink(path.join(UPLOAD_DIR, e.name)).catch(() => {})),
    );
    res.json({ ok: true, cleared: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Clear failed";
    res.status(500).json({ ok: false, error: message });
  }
});

export const uploadRouter = router;
