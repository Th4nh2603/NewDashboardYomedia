export type TavilySearchHit = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

/** User messages starting with `web - ` trigger Tavily web search. */
const WEB_SEARCH_PREFIX_RE = /^web\s*-\s*/i;

export function parseWebSearchQuestion(raw: string): {
  isWebSearch: boolean;
  query: string;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(WEB_SEARCH_PREFIX_RE);
  if (!match) {
    return { isWebSearch: false, query: trimmed };
  }
  return {
    isWebSearch: true,
    query: trimmed.slice(match[0].length).trim(),
  };
}

function requireTavilyApiKey(): string {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) throw new Error("Missing TAVILY_API_KEY");
  return key;
}

function parseMaxResults(): number {
  const raw = process.env.TAVILY_MAX_RESULTS?.trim();
  const n = raw ? Number(raw) : 5;
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(20, Math.max(1, Math.floor(n)));
}

export async function searchWebWithTavily(
  query: string,
): Promise<TavilySearchHit[]> {
  const q = query.trim();
  if (!q) throw new Error('Nhập câu hỏi sau prefix "web - "');

  const apiKey = requireTavilyApiKey();
  const maxResults = parseMaxResults();
  const timeoutMs = 20000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: q,
        search_depth: "basic",
        max_results: maxResults,
      }),
      signal: ac.signal,
    });

    const json = (await res.json()) as {
      detail?: string;
      error?: string;
      message?: string;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };

    if (!res.ok) {
      const msg =
        json?.detail || json?.error || json?.message || `HTTP ${res.status}`;
      throw new Error(`Tavily search failed (${res.status}): ${msg}`);
    }

    const results = json.results ?? [];
    return results
      .map((r) => ({
        title: String(r.title ?? "").trim() || "(no title)",
        url: String(r.url ?? "").trim(),
        content: String(r.content ?? "").trim(),
        score: typeof r.score === "number" ? r.score : undefined,
      }))
      .filter((r) => r.url.length > 0);
  } finally {
    clearTimeout(t);
  }
}

export function formatTavilyHitsForPrompt(hits: TavilySearchHit[]): string {
  if (hits.length === 0) {
    return "(Không có kết quả tìm kiếm web.)";
  }
  return hits
    .map((h, i) => {
      const score =
        typeof h.score === "number" ? `\nscore=${h.score.toFixed(3)}` : "";
      return `[#${i + 1} title=${h.title}\nurl=${h.url}${score}]\n${h.content || "(no snippet)"}`;
    })
    .join("\n\n---\n\n");
}
