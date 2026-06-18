import {
  extractUploadDemoBrandFromText,
  isBuildDemoBrandAllowed,
  normalizeBuildDemoBrandIds as normalizeBrandIds,
  resolveCanonicalBuildDemoBrand as resolveCanonicalBrand,
  type BuildDemoBrandOption,
} from "@yomedia/shared";
import demoConfig from "@/data/demoConfig.json";

export { extractUploadDemoBrandFromText, isBuildDemoBrandAllowed };

export function getBuildDemoBrandOptions(): BuildDemoBrandOption[] {
  const list = (demoConfig as { ListBrands?: Array<{ id?: string; label?: string }> })
    .ListBrands;
  return (list ?? [])
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      label: String(item.label ?? item.id ?? "").trim(),
    }))
    .filter((item) => item.id.length > 0);
}

export function getPermittedBuildDemoBrandOptions(
  allowed: string[] | null | undefined,
): BuildDemoBrandOption[] {
  return getBuildDemoBrandOptions().filter((item) =>
    isBuildDemoBrandAllowed(item.id, allowed),
  );
}

export function resolveCanonicalBuildDemoBrand(value: string): string | null {
  return resolveCanonicalBrand(value, getBuildDemoBrandOptions());
}

export function normalizeBuildDemoBrandIds(value: unknown): string[] {
  return normalizeBrandIds(
    value,
    getBuildDemoBrandOptions().map((item) => item.id),
  );
}
