/** Normalize chat commands (NFC/NFD-safe, strip accents for matching). */
export function normalizeChatCommandKey(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201C\u201D`"']/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function detectDeleteDemoIntent(input: string): boolean {
  const text = normalizeChatCommandKey(input);
  if (/^(xoa|delete|remove|undo|huy)\s+demo\.?$/.test(text)) return true;
  if (/^demo\s+(delete|remove)\.?$/.test(text)) return true;
  if (/^xoa\s+(folder|thu muc)(\s+demo)?(\s+vua\s+(upload|tai))?\.?$/.test(text)) {
    return true;
  }
  return (
    /\b(xoa|delete|remove|undo)\s+(?:the\s+)?(?:last\s+)?demo\b/.test(text) ||
    /\bdemo\s+(?:delete|remove)\b/.test(text) ||
    /\bxoa\s+(?:folder|thu muc)\s*(?:vua\s*(?:upload|tai))?\s*(?:demo)?\b/.test(
      text,
    )
  );
}

export function isDeleteDemoHelpQuestion(input: string): boolean {
  if (!detectDeleteDemoIntent(input)) return false;
  const text = normalizeChatCommandKey(input);
  return (
    /\b(how to|how do|help|instructions?|tutorial|guide)\b/.test(text) ||
    /(nhu the nao|huong dan|cach xoa|cach delete|lam sao|lam the nao)/.test(
      text,
    )
  );
}

export function extractDeleteDemoPathFromInput(input: string): string | null {
  const m = input.match(
    /(?:path|folder|remote|dir(?:ectory)?)\s*[:=]\s*(\/?script\/demo\/[^\s,;]+|[0-9]{4}\/[^\s,;]+)/i,
  );
  if (!m?.[1]) return null;
  const trimmed = m[1]
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  if (trimmed.startsWith("/script/demo/")) {
    return trimmed.replace(/\/{2,}/g, "/");
  }
  const rel = trimmed
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "");
  return `/script/demo/${rel}`.replace(/\/{2,}/g, "/");
}
