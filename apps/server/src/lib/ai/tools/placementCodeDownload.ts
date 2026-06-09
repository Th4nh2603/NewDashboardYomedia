export function detectPlacementCodeVariant(input: string): "standard" | "rtb" {
  return /\brtb\b/i.test(input) ? "rtb" : "standard";
}

export function isDownloadPlacementCodeIntent(normalized: string): boolean {
  if (/download\s+code|tai\s+code|tải\s+code/.test(normalized)) return true;
  if (/(?:download|tai|tải).*(?:placement\s+)?code/.test(normalized)) return true;
  if (/code\s+(?:yo|placement).*(?:download|tai|tải)/.test(normalized)) {
    return true;
  }
  return false;
}

function cleanWebsiteToken(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?]+$/, "")
    .replace(/^(?:rtb|sdk|yo|standard)\s+/i, "")
    .trim();
}

/** Parse website_name from chat commands like `download code : 1900.edu.vn`. */
export function extractPlacementWebsiteFromInput(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  const patterns = [
    /(?:download|tai|tải)\s+(?:placement\s+)?(?:code\s+)(?:yo\s+)?(?:rtb\s+|sdk\s+)?[:：]\s*(.+)/i,
    /(?:download|tai|tải)\s+(?:yo\s+)?(?:placement\s+)?code\s+(?:rtb\s+|sdk\s+)?(?:cho|for)\s+(.+)/i,
    /(?:download|tai|tải)\s+(?:placement\s+)?(?:code\s+)(?:yo\s+)?(?:rtb\s+|sdk\s+)?(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const cleaned = cleanWebsiteToken(match[1]);
    if (cleaned && !/^(rtb|sdk|yo|standard)$/i.test(cleaned)) {
      return cleaned;
    }
  }

  return null;
}
