import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchAdUnitOptionsForAdView } = await import(
  "../src/services/yomediaPlatform.ts"
);

const data = await fetchAdUnitOptionsForAdView("mobile");
const out = join(__dirname, "../src/data/banner-adunit-mobile.json");
writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.error(`Wrote ${out} — ${data.options.length} options`);
