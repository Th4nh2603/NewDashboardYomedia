import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchAdUnitOptionsForAdView } = await import(
  "../src/services/yomediaPlatform.ts"
);

const data = await fetchAdUnitOptionsForAdView("mobile");
console.log(JSON.stringify(data, null, 2));
