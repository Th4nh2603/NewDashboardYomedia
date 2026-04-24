import { Router, Request, Response } from "express";
import { asyncHandler, HttpError } from "../lib/http/errors.js";
import { getUserRole } from "../lib/auth/role.js";
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

/** GET: any logged-in role (header). */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const role = getUserRole(req);
    if (!role) {
      throw new HttpError(403, "Missing or invalid role", {
        code: "FORBIDDEN",
      });
    }
    let raw = await readFile(CREATIVE_DEMOS_JSON_PATH, "utf8").catch(
      (err: NodeJS.ErrnoException) => {
        if (err.code === "ENOENT") return "";
        throw err;
      },
    );
    const trimmed = raw.trim();
    if (trimmed === "") {
      res.json({ ok: true, content: '{"demos":[]}\n' });
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch {
      throw new HttpError(500, "Stored creative-demos.json is not valid JSON", {
        code: "INVALID_STORED_JSON",
      });
    }
    res.json({ ok: true, content: raw });
  }),
);

/** PUT: admin / design only — body { content: string } must be valid JSON. */
router.put(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const role = getUserRole(req);
    if (!WRITE_ROLES.has(role)) {
      throw new HttpError(
        403,
        "Forbidden: only admin/design can update creative-demos.json",
        { code: "FORBIDDEN" },
      );
    }
    const body = req.body as { content?: unknown };
    const raw = body?.content;
    let text: string;
    if (typeof raw === "string") {
      text = raw;
    } else if (raw !== undefined && raw !== null && typeof raw === "object") {
      text = JSON.stringify(raw);
    } else {
      throw new HttpError(
        400,
        "Body must include content as a JSON string (or JSON object to store).",
        { code: "BAD_REQUEST" },
      );
    }
    const trimmedForParse = text.trim() === "" ? "{}" : text;
    try {
      JSON.parse(trimmedForParse);
    } catch {
      throw new HttpError(400, "content is not valid JSON", {
        code: "BAD_REQUEST",
      });
    }
    const toWrite = text.trim() === "" ? "{}" : text;
    await writeFile(
      CREATIVE_DEMOS_JSON_PATH,
      toWrite.endsWith("\n") ? toWrite : `${toWrite}\n`,
      "utf8",
    );
    res.json({ ok: true });
  }),
);

export { router as testDataRouter };
