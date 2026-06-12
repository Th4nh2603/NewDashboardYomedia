import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchBannerCreateFormOptions } = await import(
  "../src/modules/platform/services/yomediaPlatform.js"
);

// Re-use login + fragment via internal - add temp export
const mod = await import("../src/modules/platform/services/yomediaPlatform.js");
