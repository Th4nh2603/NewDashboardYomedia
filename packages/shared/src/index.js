function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeBrandLookupKey(value) {
  return String(value || "")
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

export function extractUploadDemoBrandFromText(input) {
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
    const match = String(input || "").match(re);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function resolveCanonicalBuildDemoBrand(value, options) {
  const byKey = new Map(
    options.map((item) => [normalizeBrandLookupKey(item.id), item.id]),
  );
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const tryResolve = (raw) => byKey.get(normalizeBrandLookupKey(raw)) ?? null;

  const direct = tryResolve(trimmed);
  if (direct) return direct;

  const tokens = trimmed.split(/\s+/);
  for (let len = tokens.length; len >= 1; len--) {
    const resolved = tryResolve(tokens.slice(0, len).join(" "));
    if (resolved) return resolved;
  }
  return null;
}

export function normalizeBuildDemoBrandIds(value, validIds) {
  if (!Array.isArray(value)) return [];
  const validByKey = new Map(validIds.map((id) => [normalizeText(id), id]));
  const out = [];
  const seen = new Set();
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

export function isBuildDemoBrandAllowed(brandId, allowed) {
  if (allowed === null) return true;
  if (!allowed || allowed.length === 0) return false;
  const key = normalizeText(brandId);
  return allowed.some((id) => normalizeText(id) === key);
}
