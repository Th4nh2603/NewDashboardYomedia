import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "..", "data");

export const creativeDemosPath = path.join(dataDir, "creative-demos.json");
export const platformSnapshotPath = path.join(dataDir, "platform-snapshot.json");
export const rolePermissionsPath = path.join(dataDir, "role-permissions.json");
