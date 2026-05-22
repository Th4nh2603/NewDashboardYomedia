import demoConfig from "../data/demoConfig.json";

function normalizeText(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getBuildDemoBrandOptions(): Array<{ id: string; label: string }> {
  const list = (demoConfig as { ListBrands?: Array<{ id?: string; label?: string }> })
    .ListBrands;
  return (list ?? [])
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      label: String(item.label ?? item.id ?? "").trim(),
    }))
    .filter((item) => item.id.length > 0);
}

export function normalizeBuildDemoBrandIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const validByKey = new Map(
    getBuildDemoBrandOptions().map((item) => [normalizeText(item.id), item.id]),
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

export function isBuildDemoBrandAllowed(
  brandId: string,
  allowed: string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  const key = normalizeText(brandId);
  return allowed.some((id) => normalizeText(id) === key);
}
