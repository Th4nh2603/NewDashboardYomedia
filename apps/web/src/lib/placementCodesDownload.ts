import { backendErrorFromResponse } from "./apiError";
import { fetchWithApiAuth } from "./apiAuth";
import { serverApiUrl } from "./serverApiOrigin";

export type PlacementCodesDownloadParams = {
  websiteName: string;
  variant?: "standard" | "rtb";
};

export type PlacementCodesDownloadResult = {
  downloadName: string;
  matchedCount: number | null;
  fileCount: number | null;
};

export async function downloadPlacementCodesZip(
  params: PlacementCodesDownloadParams,
): Promise<PlacementCodesDownloadResult> {
  const websiteName = params.websiteName.trim();
  if (!websiteName) {
    throw new Error("websiteName is required");
  }

  const search = new URLSearchParams({
    websiteName,
    variant: params.variant === "rtb" ? "rtb" : "standard",
  });

  const res = await fetchWithApiAuth(
    serverApiUrl(`/api/test-data/placement-codes-zip?${search}`),
  );
  if (!res.ok) {
    throw await backendErrorFromResponse(res);
  }

  const blob = await res.blob();
  const matched = res.headers.get("X-Matched-Count");
  const fileCount = res.headers.get("X-File-Count");
  const contentDisposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const downloadName =
    filenameMatch?.[1] ??
    `${websiteName.replace(/[^a-zA-Z0-9._-]+/g, "_")}-placement-codes.zip`;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = downloadName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  return {
    downloadName,
    matchedCount: matched ? Number(matched) : null,
    fileCount: fileCount ? Number(fileCount) : null,
  };
}
