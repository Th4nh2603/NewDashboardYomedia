import brandColorsData from "../data/brandColors.json";

export type BrandColorRule = {
  keyword: string;
  className: string;
  match?: "start" | "any";
};

const brandColorRules = brandColorsData as BrandColorRule[];

/** Tailwind text class for a brand name, or undefined if no rule matches. */
export function findBrandColorClass(name: string): string | undefined {
  const lower = name.toLowerCase();
  const match = brandColorRules.find((item) => {
    const kw = item.keyword.toLowerCase();
    if (!kw) return false;
    if (item.match === "start") {
      return lower.startsWith(kw);
    }
    return lower.includes(kw);
  });
  return match?.className;
}

export function getBrandColorClass(
  name: string,
  fallback = "text-[#e5e7eb]",
): string {
  return findBrandColorClass(name) ?? fallback;
}
