import { fetchJsonOrThrow } from "../lib/apiError";

export type CreativeDemoItem = {
  id: string;
  title: string;
  image: string;
  size?: string | string[];
  position: string;
  fileType: string;
  value?: string;
  format?: string;
  video?: string;
  source?: string;
  status?: string;
  category: "Display" | "Video" | "Mobile";
  /** Adobe FLA / legacy workflow flag; default false when omitted in JSON */
  fla: boolean;
};

type CreativeDemoResponse = {
  demos?: unknown[];
};

let cache: CreativeDemoItem[] | null = null;

function getServerBaseUrl(): string {
  return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
}

function normalizeFla(item: Record<string, unknown>): boolean {
  if (typeof item.fla === "boolean") return item.fla;
  return false;
}

function normalizeDemo(raw: unknown): CreativeDemoItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? "").trim();
  const title = String(item.title ?? "").trim();
  const category = String(
    item.category ?? "",
  ).trim() as CreativeDemoItem["category"];
  if (!id || !title || !["Display", "Video", "Mobile"].includes(category))
    return null;

  return {
    id,
    title,
    image: String(item.image ?? ""),
    size: item.size as string | string[] | undefined,
    position: String(item.position ?? "-"),
    fileType: String(item.fileType ?? ""),
    value: item.value ? String(item.value) : undefined,
    format: item.format ? String(item.format).trim() : undefined,
    video: item.video ? String(item.video) : undefined,
    source: item.source ? String(item.source) : undefined,
    status: item.status ? String(item.status) : undefined,
    category,
    fla: normalizeFla(item),
  };
}

export async function loadCreativeDemos(): Promise<CreativeDemoItem[]> {
  if (cache) return cache;
  let data: CreativeDemoResponse | null = null;
  try {
    data = await fetchJsonOrThrow<CreativeDemoResponse>(
      `${getServerBaseUrl()}/api/creative-demos`,
    );
  } catch {
    // fallback below
  }
  if (!data) {
    data = await fetchJsonOrThrow<CreativeDemoResponse>("/creative-demos.json");
  }
  const demos = Array.isArray(data?.demos)
    ? data.demos
        .map(normalizeDemo)
        .filter((item): item is CreativeDemoItem => Boolean(item))
    : [];
  cache = demos;
  return demos;
}

export async function loadActiveCreativeDemos(): Promise<CreativeDemoItem[]> {
  const demos = await loadCreativeDemos();
  return demos.filter((d) => String(d.status ?? "").toLowerCase() === "active");
}

export async function loadCreativeDemoTitles(): Promise<
  { id: string; title: string; category: string }[]
> {
  const demos = await loadCreativeDemos();
  return demos
    .map((d) => ({
      id: d.id,
      title: d.title.trim(),
      category: d.category.trim(),
    }))
    .filter((item) => item.id && item.title);
}
