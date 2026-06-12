import type { Request } from "express";
import {
  detectPlacementCodeVariant,
  extractPlacementWebsiteFromInput,
} from "../../../lib/ai/tools/placementCodeDownload.js";
import {
  filterPlacementsByWebsiteName,
  listWebsiteNamesFromSnapshot,
  toSafeExportFilename,
} from "../services/placementCodeExport.js";
import { readStoredPlatformSnapshot } from "../services/platformSnapshot.js";
import { assertRouteAllowed } from "../../auth/services/authPolicy.service.js";
import type { PlacementCodesDownloadHint } from "../../../lib/ai/core/types.js";

const MAX_PLACEMENT_CODES_PER_EXPORT = 300;

export type PlacementCodeDownloadToolResult = {
  answer: string;
  executed: boolean;
  placementCodesDownload?: PlacementCodesDownloadHint;
};

export async function runPlacementCodeDownloadTool(input: {
  question: string;
  req: Request;
}): Promise<PlacementCodeDownloadToolResult> {
  assertRouteAllowed(input.req, "/test-data");

  const websiteName = extractPlacementWebsiteFromInput(input.question);
  const variant = detectPlacementCodeVariant(input.question);

  if (!websiteName) {
    return {
      answer: [
        "Chưa có **website_name**.",
        "Ví dụ: `download code : 1900.edu.vn` hoặc `tải code rtb : example.com`",
        "Lệnh tải placement embed code Yomedia (ZIP, mỗi placement một file .txt).",
      ].join("\n"),
      executed: false,
    };
  }

  const stored = await readStoredPlatformSnapshot();
  const rows = stored?.placement?.grid?.rows ?? [];
  const matched = filterPlacementsByWebsiteName(rows, websiteName);

  if (matched.length === 0) {
    const sample = (await listWebsiteNamesFromSnapshot()).slice(0, 12);
    const hint = sample.length
      ? `\nVí dụ website trong snapshot: ${sample.join(", ")}`
      : "\nChạy refresh platform snapshot trên trang Test Data trước.";
    return {
      answer: `Không tìm thấy placement cho website_name **${websiteName}**.${hint}`,
      executed: false,
    };
  }

  if (matched.length > MAX_PLACEMENT_CODES_PER_EXPORT) {
    return {
      answer: `Quá nhiều placement (${matched.length}) cho **${websiteName}**. Tối đa ${MAX_PLACEMENT_CODES_PER_EXPORT}/lần — thu hẹp tên website.`,
      executed: false,
    };
  }

  const folderName = toSafeExportFilename(websiteName);
  const zipName = `${folderName}-placement-codes${variant === "rtb" ? "-rtb" : ""}.zip`;

  return {
    answer: `Đang chuẩn bị tải ZIP **${zipName}** (${matched.length} placement, loại ${variant === "rtb" ? "RTB" : "SDK"})…`,
    executed: true,
    placementCodesDownload: {
      websiteName,
      variant,
      matchedCount: matched.length,
      zipName,
    },
  };
}
