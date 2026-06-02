/**
 * Parse WxH from banner source path (e.g. .../475x325/index.html).
 * @param {string} source
 * @returns {string | null} e.g. "475x325"
 */
export function extractSizeTokenFromSource(source) {
  const parts = String(source ?? "")
    .split(/[/\\]/)
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = (parts[i] ?? "").toLowerCase();
    const exact = seg.match(/^(\d{2,4}x\d{2,4})$/);
    if (exact?.[1]) return exact[1];
    const withSuffix = seg.match(/^(\d{2,4}x\d{2,4})-\d+$/);
    if (withSuffix?.[1]) return withSuffix[1];
  }
  return null;
}

/**
 * @param {string} token e.g. "475x325"
 * @returns {{ width: string, height: string } | null}
 */
export function parseSizeToken(token) {
  const m = String(token ?? "").match(/^(\d{2,4})x(\d{2,4})$/i);
  if (!m) return null;
  return { width: m[1], height: m[2] };
}

/**
 * @param {string} source
 * @returns {{ width: string, height: string } | null}
 */
export function parseSizeFromSource(source) {
  const token = extractSizeTokenFromSource(source);
  return token ? parseSizeToken(token) : null;
}

/** Mặc định Balloon Expandable iTVC (creative-demos 475×325). */
export const BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS = {
  max_width: "475",
  max_height: "325",
  min_width: "475",
  min_height: "325",
  bar_height: "325",
  duration: "20",
};

/**
 * Balloon Expandable: path WxH ghi đè; không có thì dùng BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS.
 * @param {Record<string, unknown>} record draft or base-shaped object
 */
export function applyBalloonSizeToBannerRecord(record) {
  if (!record.banner_settings || typeof record.banner_settings !== "object") {
    return record;
  }
  const defaults = BALLOON_EXPANDABLE_ITVC_SETTINGS_DEFAULTS;
  const parsed = parseSizeFromSource(record.source);
  const s = record.banner_settings;
  const width = parsed?.width ?? defaults.max_width;
  const height = parsed?.height ?? defaults.max_height;
  record.banner_settings = {
    ...defaults,
    ...s,
    source: record.source ?? s.source ?? "",
    max_width: width,
    max_height: height,
    min_width: width,
    min_height: height,
    bar_height: height,
    duration: defaults.duration,
  };
  return record;
}

/**
 * Masthead: form width/height + banner_settings.width/height.
 * @param {Record<string, unknown>} record
 */
export function applyMastheadSizeToBannerRecord(record) {
  const size = parseSizeFromSource(record.source);
  if (!size || !record.banner_settings || typeof record.banner_settings !== "object") {
    return record;
  }
  const s = record.banner_settings;
  if ("max_width" in s) return record;
  record.width = size.width;
  record.height = size.height;
  record.banner_settings = {
    ...s,
    source: record.source,
    width: size.width,
    height: size.height,
  };
  return record;
}
