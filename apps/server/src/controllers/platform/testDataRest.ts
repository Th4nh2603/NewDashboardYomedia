import { Router, type Request, type Response } from "express";
import { asyncHandler, HttpError } from "../../lib/http/errors.js";
import { getUserRole } from "../../lib/auth/role.js";
import { requireClerkAuth } from "../../lib/auth/clerkAuth.js";
import {
  buildPlacementCodesZipForWebsite,
  filterPlacementsByWebsiteName,
  listWebsiteNamesFromSnapshot,
} from "../../services/platform/placementCodeExport.js";
import { readStoredPlatformSnapshot } from "../../services/platform/platformSnapshot.js";
import type { PlacementEmbedCodeVariant } from "../../services/platform/yomediaPlatform.js";

const router = Router();
router.use(requireClerkAuth);

function assertTestDataAccess(req: Request): void {
  const role = getUserRole(req);
  if (!role || role === "guest") {
    throw new HttpError(403, "Forbidden", { code: "FORBIDDEN" });
  }
}

function parseVariant(raw: unknown): PlacementEmbedCodeVariant {
  return raw === "rtb" ? "rtb" : "standard";
}

/** GET /api/test-data/placement-websites — distinct website_name from snapshot */
router.get(
  "/placement-websites",
  asyncHandler(async (req: Request, res: Response) => {
    assertTestDataAccess(req);
    const websites = await listWebsiteNamesFromSnapshot();
    res.json({ ok: true, websites });
  }),
);

/** GET /api/test-data/placement-codes-preview?websiteName=... */
router.get(
  "/placement-codes-preview",
  asyncHandler(async (req: Request, res: Response) => {
    assertTestDataAccess(req);
    const websiteName = String(req.query.websiteName ?? "").trim();
    if (!websiteName) {
      throw new HttpError(400, "Missing websiteName query parameter", {
        code: "BAD_REQUEST",
      });
    }

    const stored = await readStoredPlatformSnapshot();
    const rows = stored?.placement?.grid?.rows ?? [];
    const matched = filterPlacementsByWebsiteName(rows, websiteName);

    res.json({
      ok: true,
      websiteName,
      matchedCount: matched.length,
      placements: matched.slice(0, 50).map((row) => ({
        id: row.id,
        placement_name: row.placement_name,
        website_name: row.website_name,
        type: row.type,
        size: row.size,
        active: row.active,
      })),
      truncated: matched.length > 50,
    });
  }),
);

/** GET /api/test-data/placement-codes-zip?websiteName=...&variant=standard|rtb */
router.get(
  "/placement-codes-zip",
  asyncHandler(async (req: Request, res: Response) => {
    assertTestDataAccess(req);
    const websiteName = String(req.query.websiteName ?? "").trim();
    if (!websiteName) {
      throw new HttpError(400, "Missing websiteName query parameter", {
        code: "BAD_REQUEST",
      });
    }

    const variant = parseVariant(req.query.variant);
    const { buffer, zipName, matchedCount, filenames } =
      await buildPlacementCodesZipForWebsite(websiteName, variant);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.setHeader("X-Matched-Count", String(matchedCount));
    res.setHeader("X-File-Count", String(filenames.length));
    res.send(buffer);
  }),
);

export const testDataRestRouter = router;
