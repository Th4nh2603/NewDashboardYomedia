import JSZip from "jszip";
import { HttpError } from "../../lib/http/errors.js";
import { readStoredPlatformSnapshot } from "./platformSnapshot.js";
import {
  fetchPlacementEmbedCodesBatch,
  fetchPlatformTestSnapshot,
  type PlacementCodeBatchItem,
  type PlacementEmbedCodeVariant,
  type PlatformBannerRow,
} from "./yomediaPlatform.js";

const MAX_PLACEMENT_CODES_PER_EXPORT = 300;

export function toSafeExportFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "");
  return (cleaned || "placement").slice(0, 120);
}

export function matchesWebsiteName(
  rowWebsite: unknown,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const w = String(rowWebsite ?? "")
    .trim()
    .toLowerCase();
  return w === q || w.includes(q);
}

export function filterPlacementsByWebsiteName(
  rows: PlatformBannerRow[],
  websiteName: string,
): PlatformBannerRow[] {
  return rows.filter((row) =>
    matchesWebsiteName(row.website_name, websiteName),
  );
}

function assignUniqueFilenames(
  items: PlacementCodeBatchItem[],
  variant: PlacementEmbedCodeVariant,
): Array<PlacementCodeBatchItem & { filename: string }> {
  const ext = variant === "rtb" ? ".rtb.txt" : ".txt";
  const used = new Map<string, number>();

  return items.map((item) => {
    const base =
      toSafeExportFilename(item.placementName) ||
      toSafeExportFilename(item.placementId);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const suffix = count === 0 ? "" : `_${count + 1}`;
    return {
      ...item,
      filename: `${base}${suffix}${ext}`,
    };
  });
}

async function loadPlacementRows(): Promise<PlatformBannerRow[]> {
  const stored = await readStoredPlatformSnapshot();
  if (stored?.placement?.grid?.rows?.length) {
    return stored.placement.grid.rows;
  }
  const live = await fetchPlatformTestSnapshot();
  return live.placement.grid.rows;
}

export async function listWebsiteNamesFromSnapshot(): Promise<string[]> {
  const rows = await loadPlacementRows();
  const names = new Set<string>();
  for (const row of rows) {
    const w = String(row.website_name ?? "").trim();
    if (w) names.add(w);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function buildPlacementCodesZipForWebsite(
  websiteName: string,
  variant: PlacementEmbedCodeVariant = "standard",
): Promise<{
  buffer: Buffer;
  zipName: string;
  websiteQuery: string;
  matchedCount: number;
  filenames: string[];
}> {
  const query = websiteName.trim();
  if (!query) {
    throw new HttpError(400, "websiteName is required", {
      code: "BAD_REQUEST",
    });
  }

  const rows = await loadPlacementRows();
  const matched = filterPlacementsByWebsiteName(rows, query);
  if (matched.length === 0) {
    throw new HttpError(
      404,
      `No placements found for website_name matching "${query}"`,
      { code: "PLACEMENT_WEBSITE_NOT_FOUND" },
    );
  }
  if (matched.length > MAX_PLACEMENT_CODES_PER_EXPORT) {
    throw new HttpError(
      413,
      `Too many placements (${matched.length}). Maximum per export is ${MAX_PLACEMENT_CODES_PER_EXPORT}.`,
      { code: "PLACEMENT_EXPORT_TOO_LARGE" },
    );
  }

  const batch = await fetchPlacementEmbedCodesBatch(
    matched.map((row) => ({
      id: String(row.id),
      placement_name: row.placement_name,
      website_name: row.website_name,
    })),
    variant,
  );

  const files = assignUniqueFilenames(batch, variant);
  const folderName = toSafeExportFilename(query);
  const zip = new JSZip();
  const folder = zip.folder(folderName) ?? zip;

  for (const file of files) {
    folder.file(file.filename, file.code);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    buffer,
    zipName: `${folderName}-placement-codes${variant === "rtb" ? "-rtb" : ""}.zip`,
    websiteQuery: query,
    matchedCount: files.length,
    filenames: files.map((f) => f.filename),
  };
}
