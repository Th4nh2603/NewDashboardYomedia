import { Router, Request, Response } from "express";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREATIVE_DEMOS_JSON_PATH = path.join(
  __dirname,
  "..",
  "data",
  "creative-demos.json",
);
const WRITE_ROLES = new Set(["admin", "design"]);

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

/** GET: any logged-in role (header). */
router.get("/", async (req: Request, res: Response) => {
  const role = getUserRole(req);
  if (!role) {
    res.status(403).json({ ok: false, error: "Missing or invalid role" });
    return;
  }
  try {
    let raw = await readFile(CREATIVE_DEMOS_JSON_PATH, "utf8").catch(
      (err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") return "";
        throw err;
      },
    );
    const trimmed = raw.trim();
    if (trimmed === "") {
      return res.json({ ok: true, content: '{"demos":[]}\n' });
    }
    JSON.parse(trimmed);
    return res.json({ ok: true, content: raw });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to read test data";
    res.status(500).json({ ok: false, error: message });
  }
});

/** PUT: admin / design only — body { content: string } must be valid JSON. */
router.put("/", async (req: Request, res: Response) => {
  const role = getUserRole(req);
  if (!WRITE_ROLES.has(role)) {
    res.status(403).json({
      ok: false,
      error:
        "Forbidden: only admin/design can update creative-demos.json",
    });
    return;
  }
  const body = req.body as { content?: unknown };
  const raw = body?.content;
  let text: string;
  if (typeof raw === "string") {
    text = raw;
  } else if (raw !== undefined && raw !== null && typeof raw === "object") {
    text = JSON.stringify(raw);
  } else {
    res.status(400).json({
      ok: false,
      error: "Body must include content as a JSON string (or JSON object to store).",
    });
    return;
  }
  const trimmedForParse = text.trim() === "" ? "{}" : text;
  try {
    JSON.parse(trimmedForParse);
  } catch {
    res.status(400).json({ ok: false, error: "content is not valid JSON" });
    return;
  }
  const toWrite = text.trim() === "" ? "{}" : text;
  try {
    await writeFile(
      CREATIVE_DEMOS_JSON_PATH,
      toWrite.endsWith("\n") ? toWrite : `${toWrite}\n`,
      "utf8",
    );
    return res.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to save test data";
    res.status(500).json({ ok: false, error: message });
  }
});

export { router as testDataRouter };
