/**
 * Fetch banner + placement from platform and save to JSON.
 *
 * Usage (from repo root):
 *   npx tsx apps/server/scripts/exportPlatformSnapshot.js
 *
 * Output:
 *   apps/server/src/data/platform-snapshot.json
 *
 * Env (apps/server/.env):
 *   YOMEDIA_PLATFORM_USERNAME
 *   YOMEDIA_PLATFORM_PASSWORD
 *   YOMEDIA_PLATFORM_BASE_URL (optional)
 */

import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const { fetchPlatformTestSnapshot } = await import(
  "../src/services/platform/yomediaPlatform.ts"
);
const { writePlatformSnapshot, platformSnapshotPath } = await import(
  "../src/services/platform/platformSnapshot.ts"
);

const snapshot = await fetchPlatformTestSnapshot();
const stored = await writePlatformSnapshot(snapshot);

console.log(
  JSON.stringify(
    {
      savedTo: platformSnapshotPath,
      savedAt: stored.savedAt,
      bannerRows: stored.banner.grid.rows.length,
      placementRows: stored.placement.grid.rows.length,
      placementFormFields: stored.placement.createForm.fields.length,
    },
    null,
    2,
  ),
);
