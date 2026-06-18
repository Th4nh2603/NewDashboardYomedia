import { getYomediaDemoPreviewUrl } from "@/components/dashboard/OpenDemo";
import { loadCreativeDemos } from "@/data/creativeDemos";
import {
  buildVideoMakeVastXml,
  VIDEO_DEMO_FIXED_REL_PATH,
} from "../buildDemoAssets";
import { serverApiOrigin } from "@/api/serverApiOrigin";
import { demoRemoteBase, resolveAvailableRemotePath, type SftpClient } from "./path";

export type UploadVideoDemoProgress = (percent: number, label: string) => void;

export type VideoPreviewLink = {
  label: string;
  formatValue: string;
  previewUrl: string | null;
};

export type UploadVideoDemoResult = {
  remoteBase: string;
  remotePath: string;
  uploaded: number;
  logs: string[];
  videoPreviews: VideoPreviewLink[];
  previewUrl: string | null;
  formatValue: string;
};

const DEFAULT_VIDEO_PREVIEW_SPECS = [
  { formatValue: "outstream", title: "Video In-read" },
  { formatValue: "instream", title: "Video Pre-roll" },
] as const;

function isCreativeVideoDemo(
  item: Awaited<ReturnType<typeof loadCreativeDemos>>[number],
): boolean {
  return String(item.fileType ?? "").trim().toUpperCase() === "VIDEO";
}

/** Build Demo video flow: In-read (outstream) + Pre-roll (instream) preview links. */
export async function buildDefaultVideoPreviewLinks(
  remotePath: string,
): Promise<VideoPreviewLink[]> {
  const demos = await loadCreativeDemos();
  const serverApiUrl = serverApiOrigin();
  const out: VideoPreviewLink[] = [];

  for (const spec of DEFAULT_VIDEO_PREVIEW_SPECS) {
    const row =
      demos.find(
        (item) =>
          isCreativeVideoDemo(item) &&
          String(item.value ?? "").trim() === spec.formatValue &&
          String(item.status ?? "").trim().toLowerCase() !== "inactive",
      ) ?? null;
    const title = String(row?.title ?? spec.title).trim() || spec.title;
    const label = `${title} · ${spec.formatValue}`;
    const instreamVideo =
      String(row?.category ?? "").trim().toLowerCase() === "video";
    const previewUrl = await getYomediaDemoPreviewUrl({
      remotePath,
      serverApiUrl,
      formatValue: spec.formatValue,
      instreamVideo,
    });
    out.push({
      label,
      formatValue: spec.formatValue,
      previewUrl,
    });
  }

  return out;
}

export type UploadVideoDemoParams = {
  sftpClient: SftpClient;
  videoFile: File;
  /** Canonical brand id without `brand-` prefix. */
  brandToken: string;
  requestedRemotePath?: string;
  /** When true and path empty, auto-pick `YYYY/MM/<brand>/all/video` (+ suffix if taken). */
  autoResolvePath?: boolean;
  onProgress?: UploadVideoDemoProgress;
};

/**
 * Upload a single video demo (tvc.mp4 + make-vast.xml) to SFTP.
 * Brand validation must be done by the caller.
 */
export async function uploadVideoDemo(
  params: UploadVideoDemoParams,
): Promise<UploadVideoDemoResult> {
  const {
    sftpClient,
    videoFile,
    brandToken,
    requestedRemotePath = "",
    autoResolvePath = true,
    onProgress,
  } = params;

  const setProgress = (percent: number, label: string) => {
    onProgress?.(Math.max(0, Math.min(100, Math.round(percent))), label);
  };

  if (!brandToken.trim()) {
    throw new Error(
      "Missing brand. Use `brand: <name>` (or include brand in `path:`).",
    );
  }

  setProgress(20, "Resolving video demo path...");
  const trimmedPath = requestedRemotePath.trim();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const demoFormatSeg = "video";
  const pathPrefix = [year, month, brandToken, "all"];

  let resolvedRemotePath =
    trimmedPath || [...pathPrefix, demoFormatSeg].filter(Boolean).join("/");

  if (!trimmedPath && autoResolvePath) {
    const parts = resolvedRemotePath.split("/").filter(Boolean);
    const baseSeg = parts.pop() ?? demoFormatSeg;
    const prefix = parts.length > 0 ? parts : pathPrefix;
    resolvedRemotePath = await resolveAvailableRemotePath(
      sftpClient,
      prefix,
      baseSeg,
    );
  }

  const remoteBase = demoRemoteBase(resolvedRemotePath);

  setProgress(38, "Ensuring remote folder on SFTP...");
  const mkdirRes = await sftpClient.mkdir(remoteBase, { scope: "demo" });
  if (mkdirRes?.ok === false && mkdirRes.error) {
    throw new Error(mkdirRes.error);
  }

  const videoRemotePath = `${remoteBase}/${VIDEO_DEMO_FIXED_REL_PATH}`.replace(
    /\/{2,}/g,
    "/",
  );
  const fileSizeMb = videoFile.size / (1024 * 1024);
  setProgress(
    42,
    fileSizeMb > 4
      ? `Uploading video (${fileSizeMb.toFixed(1)} MB) — server may compress, please wait…`
      : "Uploading video as tvc.mp4…",
  );

  const logs: string[] = [];
  let pulsePercent = 42;
  const pulseTimer = window.setInterval(() => {
    pulsePercent = Math.min(68, pulsePercent + 1);
    setProgress(
      pulsePercent,
      fileSizeMb > 4
        ? `Processing video on server (${fileSizeMb.toFixed(1)} MB) — compression can take several minutes…`
        : "Uploading video as tvc.mp4…",
    );
  }, 4000);

  let videoRes: Awaited<ReturnType<SftpClient["writeBinary"]>>;
  try {
    videoRes = await sftpClient.writeBinary(videoRemotePath, videoFile, {
      scope: "demo",
    });
  } finally {
    window.clearInterval(pulseTimer);
  }
  if (!videoRes?.ok) {
    throw new Error(videoRes?.error || "Video upload failed.");
  }
  logs.push(`Uploaded video: ${videoRemotePath}`);

  setProgress(70, "Uploading make-vast.xml...");
  const xmlRemotePath = `${remoteBase}/make-vast.xml`.replace(/\/{2,}/g, "/");
  const xmlRes = await sftpClient.write({
    path: xmlRemotePath,
    content: buildVideoMakeVastXml(resolvedRemotePath),
  });
  if (!xmlRes?.ok) {
    throw new Error(xmlRes?.error || "make-vast.xml upload failed.");
  }
  logs.push(`Uploaded VAST: ${xmlRemotePath}`);

  setProgress(92, "Generating preview URLs...");
  const videoPreviews = await buildDefaultVideoPreviewLinks(resolvedRemotePath);

  setProgress(100, "Video demo upload completed.");

  return {
    remoteBase,
    remotePath: resolvedRemotePath,
    uploaded: 2,
    logs,
    videoPreviews,
    previewUrl: videoPreviews.find((p) => p.previewUrl)?.previewUrl ?? null,
    formatValue: videoPreviews.map((p) => p.formatValue).join(", "),
  };
}
