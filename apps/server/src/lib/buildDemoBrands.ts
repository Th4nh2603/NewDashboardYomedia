import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeBrandLookupKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const UPLOAD_DEMO_BRAND_NAME =
  String.raw`(?:[a-z0-9][a-z0-9_-]*(?:\s+[a-z0-9][a-z0-9_-]*)*)`;
const UPLOAD_DEMO_BRAND_STOP =
  String.raw`\s+(?:format|demoValue|demo_value|value|path|to|target|demoId|demo_id|creativeId|creative_id)\b`;

export function extractUploadDemoBrandFromText(input: string): string | null {
  const patterns = [
    new RegExp(
      `\\bbrand\\s*[:=]\\s*(${UPLOAD_DEMO_BRAND_NAME})(?:${UPLOAD_DEMO_BRAND_STOP}|$)`,
      "i",
    ),
    new RegExp(
      `\\bbrand\\s+(${UPLOAD_DEMO_BRAND_NAME})(?:${UPLOAD_DEMO_BRAND_STOP}|$)`,
      "i",
    ),
    new RegExp(
      `\\b(?:for|cho)\\s+brand\\s+(${UPLOAD_DEMO_BRAND_NAME})(?:${UPLOAD_DEMO_BRAND_STOP}|$)`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = input.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function resolveCanonicalBuildDemoBrand(value: string): string | null {
  const byKey = new Map(
    getBuildDemoBrandOptions().map((item) => [
      normalizeBrandLookupKey(item.id),
      item.id,
    ]),
  );
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const tryResolve = (raw: string) => byKey.get(normalizeBrandLookupKey(raw)) ?? null;

  const direct = tryResolve(trimmed);
  if (direct) return direct;

  const tokens = trimmed.split(/\s+/);
  for (let len = tokens.length; len >= 1; len--) {
    const resolved = tryResolve(tokens.slice(0, len).join(" "));
    if (resolved) return resolved;
  }
  return null;
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

/** `null` = full access (admin). Empty array = no brands. Non-empty = whitelist only. */
export function isBuildDemoBrandAllowed(
  brandId: string,
  allowed: string[] | null | undefined,
): boolean {
  if (allowed === null) return true;
  if (!allowed || allowed.length === 0) return false;
  const key = normalizeText(brandId);
  return allowed.some((id) => normalizeText(id) === key);
}
