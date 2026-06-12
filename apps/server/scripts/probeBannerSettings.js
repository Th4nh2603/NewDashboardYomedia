import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchBannerSettingsForTemplate } = await import(
  "../src/modules/platform/services/yomediaPlatform.js"
);

const data = await fetchBannerSettingsForTemplate(
  "5206c4076aaf4167a290292f0b2a1c0d",
  "template",
);
writeFileSync(
  join(__dirname, "../tmp-banner-settings.json"),
  JSON.stringify(data, null, 2),
  "utf8",
);
console.error(data.fields.length, "fields");
