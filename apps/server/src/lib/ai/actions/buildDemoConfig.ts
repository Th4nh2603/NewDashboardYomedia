import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBuildDemoBrandOptions,
  isBuildDemoBrandAllowed,
  resolveCanonicalBuildDemoBrand,
} from "../../buildDemoBrands.js";
import { logBestEffort } from "../../logBestEffort.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type DemoConfig = {
  ListProductCate?: Array<{ id?: string; label?: string }>;
  ProductCateIdsByBrand?: Record<string, string[]>;
};

let cachedConfig: DemoConfig | null = null;

function loadDemoConfig(): DemoConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const demoConfigPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "web",
      "data",
      "demoConfig.json",
    );
    cachedConfig = JSON.parse(fs.readFileSync(demoConfigPath, "utf8")) as DemoConfig;
  } catch (err) {
    logBestEffort("ai.buildDemoConfig.load", err);
    cachedConfig = {};
  }
  return cachedConfig;
}

export function getProductCateOptions(brandId: string) {
  const config = loadDemoConfig();
  const all = config.ListProductCate ?? [];
  const byBrand = config.ProductCateIdsByBrand ?? {};
  if (!brandId?.trim()) {
    return all.filter((item) => String(item.id ?? "").toLowerCase() === "all");
  }
  const allowedRaw =
    byBrand[brandId] ??
    Object.entries(byBrand).find(
      ([key]) => key.toLowerCase() === brandId.toLowerCase(),
    )?.[1];
  if (!allowedRaw?.length) {
    return all.filter((item) => String(item.id ?? "").toLowerCase() === "all");
  }
  const allowed = new Set(
    allowedRaw.map((id) => String(id).trim().toLowerCase()),
  );
  allowed.add("all");
  return all.filter((item) =>
    allowed.has(
      String(item.id ?? "")
        .trim()
        .toLowerCase(),
    ),
  );
}

export function resolveProductCateId(
  raw: string,
  brandId: string,
): string | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  for (const item of getProductCateOptions(brandId)) {
    const id = String(item.id ?? "").trim();
    const label = String(item.label ?? id).trim();
    if (
      id.toLowerCase() === needle ||
      label.toLowerCase() === needle ||
      label.toLowerCase().includes(needle)
    ) {
      return id;
    }
  }
  return null;
}

export function getBrandLabel(brandId: string): string {
  const match = getBuildDemoBrandOptions().find(
    (item) => item.id.toLowerCase() === brandId.toLowerCase(),
  );
  return match?.label ?? brandId;
}

export function getProductCateLabel(productCateId: string): string {
  const config = loadDemoConfig();
  const match = (config.ListProductCate ?? []).find(
    (item) =>
      String(item.id ?? "").toLowerCase() === productCateId.toLowerCase(),
  );
  return String(match?.label ?? productCateId);
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
