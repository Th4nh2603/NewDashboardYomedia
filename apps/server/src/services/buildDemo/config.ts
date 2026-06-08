import {
  getBuildDemoBrandOptions,
  isBuildDemoBrandAllowed,
  resolveCanonicalBuildDemoBrand,
} from "../../repositories/brand.repository.js";

export function getBrandLabel(brandId: string): string {
  const match = getBuildDemoBrandOptions().find(
    (item) => item.id.toLowerCase() === brandId.toLowerCase(),
  );
  return match?.label ?? brandId;
}

export function filterAllowedBrandIds(
  brandId: string,
  allowedBrands: string[] | null,
): boolean {
  return isBuildDemoBrandAllowed(brandId, allowedBrands);
}

export function listAllowedBrandOptions(allowedBrands: string[] | null) {
  const all = getBuildDemoBrandOptions();
  if (allowedBrands === null) return all;
  if (!allowedBrands.length) return [];
  return all.filter((item) => isBuildDemoBrandAllowed(item.id, allowedBrands));
}

export { resolveCanonicalBuildDemoBrand };
