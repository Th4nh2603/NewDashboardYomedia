/**
 * Export all <select> options from platform /banner/create to JSON.
 *
 * Usage (from repo root):
 *   npx tsx apps/server/scripts/exportBannerCreateOptions.js
 *
 * Output:
 *   apps/server/src/data/banner-create-options.json
 *
 * Env (apps/server/.env):
 *   YOMEDIA_PLATFORM_USERNAME
 *   YOMEDIA_PLATFORM_PASSWORD
 *   YOMEDIA_PLATFORM_BASE_URL (optional)
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const outPath = join(__dirname, "../src/data/banner-create-options.json");

const { fetchBannerCreateFormOptions } = await import(
  "../src/services/platform/yomediaPlatform.ts"
);

try {
  const data = await fetchBannerCreateFormOptions();
  writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const totalOptions = data.selects.reduce((n, s) => n + s.optionCount, 0);
  const adUnitViews = Object.keys(data.adUnitsByAdView ?? {});
  const adUnitTotal = adUnitViews.reduce(
    (n, k) => n + (data.adUnitsByAdView[k]?.optionCount ?? 0),
    0,
  );
  const templateViews = Object.keys(data.templatesByAdView ?? {});
  const templateTotal = templateViews.reduce(
    (n, k) => n + (data.templatesByAdView[k]?.optionCount ?? 0),
    0,
  );
  console.error(
    `Wrote ${outPath}\n` +
      `  ${data.selects.length} select(s), ${totalOptions} option(s) on create form\n` +
      `  adUnitsByAdView: ${adUnitViews.join(", ")} (${adUnitTotal} option rows)\n` +
      `  templatesByAdView: ${templateViews.join(", ")} (${templateTotal} template rows)`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
}
