import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchTemplateOptionsForAdView } = await import(
  "../src/services/platform/yomediaPlatform.ts"
);

for (const adView of ["display", "mobile"]) {
  const data = await fetchTemplateOptionsForAdView(adView);
  console.error(
    adView,
    data.optionCount,
    data.options.slice(0, 3).map((o) => o.label),
  );
}
