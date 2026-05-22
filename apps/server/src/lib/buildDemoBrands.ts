import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

let cachedBrandIds: string[] | null = null;

export function getBuildDemoBrandIds(): string[] {
  if (cachedBrandIds) return cachedBrandIds;
  try {
    const demoConfigPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "web",
      "data",
      "demoConfig.json",
    );
    const raw = fs.readFileSync(demoConfigPath, "utf8");
    const parsed = JSON.parse(raw) as { ListBrands?: Array<{ id?: string }> };
    cachedBrandIds = (parsed.ListBrands ?? [])
      .map((item) => String(item.id ?? "").trim())
      .filter(Boolean);
  } catch {
    cachedBrandIds = [];
  }
  return cachedBrandIds;
}

export function normalizeBuildDemoBrandIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const validByKey = new Map(
    getBuildDemoBrandIds().map((id) => [normalizeText(id), id]),
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const key = normalizeText(item);
    const canonical = validByKey.get(key);
    if (!canonical || seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }
  return out;
}

export function getBuildDemoBrandOptions(): Array<{ id: string; label: string }> {
  try {
    const demoConfigPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "web",
      "data",
      "demoConfig.json",
    );
    const raw = fs.readFileSync(demoConfigPath, "utf8");
    const parsed = JSON.parse(raw) as {
      ListBrands?: Array<{ id?: string; label?: string }>;
    };
    return (parsed.ListBrands ?? [])
      .map((item) => ({
        id: String(item.id ?? "").trim(),
        label: String(item.label ?? item.id ?? "").trim(),
      }))
      .filter((item) => item.id.length > 0);
  } catch {
    return getBuildDemoBrandIds().map((id) => ({ id, label: id }));
  }
}

export function isBuildDemoBrandAllowed(
  brandId: string,
  allowed: string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  const key = normalizeText(brandId);
  return allowed.some((id) => normalizeText(id) === key);
}
