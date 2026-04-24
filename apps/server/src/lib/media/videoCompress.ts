import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(fileURLToPath(import.meta.url));

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);

function videoCompressDisabled(): boolean {
  const v = process.env.VIDEO_COMPRESS?.trim().toLowerCase();
  return v === "0" || v === "false" || v === "off";
}

/** Mặc định: nén về tối đa ~4 MB (file lớn hơn mới xử lý). */
const DEFAULT_TARGET_MAX_BYTES = 4 * 1024 * 1024;

function targetMaxBytes(): number {
  const mb = Number(process.env.VIDEO_TARGET_MAX_MB);
  if (Number.isFinite(mb) && mb > 0) {
    return Math.round(mb * 1024 * 1024);
  }
  const raw = Number(process.env.VIDEO_TARGET_MAX_BYTES);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  return DEFAULT_TARGET_MAX_BYTES;
}

/** Bitrate âm thanh khi tính ngân sách (AAC/Opus ~96k). */
const AUDIO_BPS = 96_000;
const MIN_VIDEO_BPS = 50_000;

function crfH264(): number {
  const n = Number(process.env.VIDEO_CRF_H264);
  if (Number.isFinite(n) && n >= 18 && n <= 51) return Math.round(n);
  return 28;
}

function crfVp9(): number {
  const n = Number(process.env.VIDEO_CRF_VP9);
  if (Number.isFinite(n) && n >= 4 && n <= 63) return Math.round(n);
  return 35;
}

async function probeDurationAndAudio(
  ffmpegBin: string,
  inputPath: string,
): Promise<{ durationSec: number; hasAudio: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin, ["-hide_banner", "-i", inputPath], {
      windowsHide: true,
    });
    let out = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      out += chunk;
    });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      out += chunk;
    });
    child.on("error", reject);
    child.on("close", () => {
      const dm = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      if (!dm) {
        reject(new Error("probe: no duration"));
        return;
      }
      const durationSec =
        parseInt(dm[1], 10) * 3600 +
        parseInt(dm[2], 10) * 60 +
        parseFloat(dm[3]);
      const hasAudio =
        /Stream #\d+:\d+[^\n]*Audio/i.test(out) || /\bAudio:\s*\w+/i.test(out);
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        reject(new Error("probe: invalid duration"));
        return;
      }
      resolve({ durationSec, hasAudio });
    });
  });
}

function videoBpsForTarget(
  targetBytes: number,
  durationSec: number,
  hasAudio: boolean,
): number {
  const total = (targetBytes * 8) / durationSec;
  const audioPart = hasAudio ? AUDIO_BPS : 0;
  return Math.max(MIN_VIDEO_BPS, total - audioPart);
}

function ffmpegBinaryPath(): string | null {
  const fromEnv = process.env.FFMPEG_BIN?.trim();
  if (fromEnv) return fromEnv;
  try {
    const bundled = require("ffmpeg-static") as string | null | undefined;
    if (
      typeof bundled === "string" &&
      bundled.length > 0 &&
      existsSync(bundled)
    ) {
      return bundled;
    }
  } catch {
    /* optional dependency resolution */
  }
  return null;
}

function runFfmpeg(ffmpegBin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin, args, { windowsHide: true });
    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-900)}`));
    });
  });
}

async function transcodeToFileBitrate(params: {
  ffmpegBin: string;
  inputPath: string;
  outputPath: string;
  ext: string;
  videoBps: number;
  hasAudio: boolean;
}): Promise<void> {
  const { ffmpegBin, inputPath, outputPath, ext, videoBps, hasAudio } = params;
  const commonIn = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
  ];
  const videoK = Math.max(50, Math.round(videoBps / 1000));
  const maxK = Math.round(videoK * 1.35);
  const bufK = Math.round(videoK * 2);

  const isWebm = ext === ".webm";

  const h264WithAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "faster",
    "-b:v",
    `${videoK}k`,
    "-maxrate",
    `${maxK}k`,
    "-bufsize",
    `${bufK}k`,
    "-movflags",
    "+faststart",
    "-map",
    "0:a?",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    outputPath,
  ];

  const h264NoAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "faster",
    "-b:v",
    `${videoK}k`,
    "-maxrate",
    `${maxK}k`,
    "-bufsize",
    `${bufK}k`,
    "-movflags",
    "+faststart",
    "-an",
    outputPath,
  ];

  const vp9WithAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    `${videoK}k`,
    "-maxrate",
    `${maxK}k`,
    "-row-mt",
    "1",
    "-cpu-used",
    "2",
    "-map",
    "0:a?",
    "-c:a",
    "libopus",
    "-b:a",
    "96k",
    outputPath,
  ];

  const vp9NoAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    `${videoK}k`,
    "-maxrate",
    `${maxK}k`,
    "-row-mt",
    "1",
    "-cpu-used",
    "2",
    "-an",
    outputPath,
  ];

  if (isWebm) {
    if (hasAudio) {
      try {
        await runFfmpeg(ffmpegBin, vp9WithAudio);
      } catch {
        await runFfmpeg(ffmpegBin, vp9NoAudio);
      }
    } else {
      await runFfmpeg(ffmpegBin, vp9NoAudio);
    }
    return;
  }

  if (hasAudio) {
    try {
      await runFfmpeg(ffmpegBin, h264WithAudio);
    } catch {
      await runFfmpeg(ffmpegBin, h264NoAudio);
    }
  } else {
    await runFfmpeg(ffmpegBin, h264NoAudio);
  }
}

/** Dự phòng khi probe duration thất bại — CRF như trước. */
async function transcodeToFileCrfFallback(params: {
  ffmpegBin: string;
  inputPath: string;
  outputPath: string;
  ext: string;
}): Promise<void> {
  const { ffmpegBin, inputPath, outputPath, ext } = params;
  const commonIn = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
  ];

  const h264Out = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-crf",
    String(crfH264()),
    "-preset",
    "faster",
    "-movflags",
    "+faststart",
    "-map",
    "0:a?",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    outputPath,
  ];

  const h264OutNoAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-crf",
    String(crfH264()),
    "-preset",
    "faster",
    "-movflags",
    "+faststart",
    "-an",
    outputPath,
  ];

  const vp9Out = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libvpx-vp9",
    "-crf",
    String(crfVp9()),
    "-b:v",
    "0",
    "-row-mt",
    "1",
    "-map",
    "0:a?",
    "-c:a",
    "libopus",
    "-b:a",
    "96k",
    outputPath,
  ];

  const vp9OutNoAudio = [
    ...commonIn,
    "-map",
    "0:v:0",
    "-c:v",
    "libvpx-vp9",
    "-crf",
    String(crfVp9()),
    "-b:v",
    "0",
    "-row-mt",
    "1",
    "-an",
    outputPath,
  ];

  const isWebm = ext === ".webm";
  const withAudio = isWebm ? vp9Out : h264Out;
  const noAudio = isWebm ? vp9OutNoAudio : h264OutNoAudio;

  try {
    await runFfmpeg(ffmpegBin, withAudio);
  } catch {
    await runFfmpeg(ffmpegBin, noAudio);
  }
}

export function isCompressibleVideoFilename(filename: string): boolean {
  return VIDEO_EXT.has(path.extname(filename).toLowerCase());
}

export type VideoCompressResult = {
  buffer: Buffer;
  originalBytes: number;
  compressedBytes: number;
  videoCompressed: boolean;
};

/**
 * Re-encode common web video formats before storage / SFTP.
 * Mặc định: file lớn hơn ~4 MB được mã hóa theo bitrate để gần 4 MB; file ≤4 MB giữ nguyên.
 * Có thể đổi ngưỡng bằng VIDEO_TARGET_MAX_MB. Nếu probe duration lỗi, dùng CRF (fallback).
 */
export async function maybeCompressVideoUpload(
  buffer: Buffer,
  filenameHint: string,
): Promise<VideoCompressResult> {
  const originalBytes = buffer.length;
  if (!isCompressibleVideoFilename(filenameHint)) {
    return {
      buffer,
      originalBytes,
      compressedBytes: originalBytes,
      videoCompressed: false,
    };
  }
  if (videoCompressDisabled()) {
    return {
      buffer,
      originalBytes,
      compressedBytes: originalBytes,
      videoCompressed: false,
    };
  }

  const ffmpegBin = ffmpegBinaryPath();
  if (!ffmpegBin) {
    console.warn(
      "[videoCompress] No ffmpeg binary (set FFMPEG_BIN or run ffmpeg-static install). Skipping.",
    );
    return {
      buffer,
      originalBytes,
      compressedBytes: originalBytes,
      videoCompressed: false,
    };
  }

  const ext = path.extname(filenameHint).toLowerCase() || ".mp4";
  const workDir = path.join(
    tmpdir(),
    `vidcmp-${randomBytes(12).toString("hex")}`,
  );
  const inputPath = path.join(workDir, `in${ext}`);
  const outputPath = path.join(workDir, `out${ext}`);
  const maxTarget = targetMaxBytes();

  try {
    await mkdir(workDir, { recursive: true });
    await writeFile(inputPath, buffer);

    if (originalBytes <= maxTarget) {
      return {
        buffer,
        originalBytes,
        compressedBytes: originalBytes,
        videoCompressed: false,
      };
    }

    try {
      const probe = await probeDurationAndAudio(ffmpegBin, inputPath);
      const videoBps = videoBpsForTarget(
        maxTarget,
        probe.durationSec,
        probe.hasAudio,
      );
      await transcodeToFileBitrate({
        ffmpegBin,
        inputPath,
        outputPath,
        ext,
        videoBps,
        hasAudio: probe.hasAudio,
      });
    } catch (probeErr) {
      console.warn(
        "[videoCompress] bitrate target failed, using CRF fallback:",
        probeErr,
      );
      await transcodeToFileCrfFallback({
        ffmpegBin,
        inputPath,
        outputPath,
        ext,
      });
    }

    const outBuf = await readFile(outputPath);
    const compressedBytes = outBuf.length;
    const minRatio = Number(process.env.VIDEO_COMPRESS_MIN_RATIO) || 0.98;
    const ratioOk =
      Number.isFinite(minRatio) && minRatio > 0 && minRatio <= 1
        ? minRatio
        : 0.98;
    if (compressedBytes >= originalBytes * ratioOk) {
      return {
        buffer,
        originalBytes,
        compressedBytes: originalBytes,
        videoCompressed: false,
      };
    }
    return {
      buffer: outBuf,
      originalBytes,
      compressedBytes,
      videoCompressed: true,
    };
  } catch (err) {
    console.warn("[videoCompress] failed, using original:", err);
    return {
      buffer,
      originalBytes,
      compressedBytes: originalBytes,
      videoCompressed: false,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
