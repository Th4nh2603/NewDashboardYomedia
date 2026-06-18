export type BuildDemoBrandOption = {
  id: string;
  label: string;
};

export function extractUploadDemoBrandFromText(input: string): string | null;

export function resolveCanonicalBuildDemoBrand(
  value: string,
  options: BuildDemoBrandOption[],
): string | null;

export function normalizeBuildDemoBrandIds(
  value: unknown,
  validIds: string[],
): string[];

export function isBuildDemoBrandAllowed(
  brandId: string,
  allowed: string[] | null | undefined,
): boolean;
