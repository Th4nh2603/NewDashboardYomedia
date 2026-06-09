import fs from "fs";
import { creativeDemosPath } from "../infra/paths.js";

export function loadCreativeDemos() {
  const raw = fs.readFileSync(creativeDemosPath, "utf8");
  const safeRaw = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const parsed = JSON.parse(safeRaw) as { demos?: unknown[] };
  return parsed.demos || [];
}

export function listActiveCreativeDemos() {
  return loadCreativeDemos().filter(
    (d) =>
      String((d as { status?: unknown })?.status ?? "").toLowerCase() ===
      "active",
  );
}

export function listCreativeDemoTitles(activeOnly: boolean) {
  let demos = loadCreativeDemos();
  if (activeOnly) {
    demos = demos.filter(
      (d) =>
        String((d as { status?: unknown })?.status ?? "").toLowerCase() ===
        "active",
    );
  }
  const items = demos
    .map((d) => {
      const row = d as Record<string, unknown>;
      return {
        id: String(row?.id ?? "").trim(),
        title: typeof row?.title === "string" ? row.title.trim() : "",
        category: typeof row?.category === "string" ? row.category.trim() : "",
        value: typeof row?.value === "string" ? row.value.trim() : "",
        fileType:
          typeof row?.fileType === "string" ? row.fileType.trim() : "",
        size: Array.isArray(row?.size)
          ? row.size.map((s: unknown) => String(s ?? "").trim()).filter(Boolean)
          : typeof row?.size === "string"
            ? row.size.trim()
            : "",
        fla: row?.fla === true,
      };
    })
    .filter((item) => item.id && item.title);
  return items;
}
