import React from "react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { backendErrorFromResponse, fetchJsonOrThrow } from "../lib/apiError";

const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

const TestData: React.FC = () => {
  const { user } = useAuth();
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const role = (user?.role || "").toLowerCase();
  const canEdit = role === "admin" || role === "design";

  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [compressing, setCompressing] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [videoResult, setVideoResult] = React.useState<{
    savedName: string;
    clientBytes: number;
    originalBytes: number;
    compressedBytes: number;
    videoCompressed: boolean;
  } | null>(null);
  const [downloadingVideo, setDownloadingVideo] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        content?: string;
        error?: string;
      }>(`${baseUrl}/api/test-data`, {
        headers: { "x-user-role": role },
      });
      if (!data.ok) {
        throw new Error(data.error || "Unable to load creative-demos.json");
      }
      setContent(
        typeof data.content === "string" ? data.content : '{"demos":[]}\n',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load creative-demos.json",
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, role]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/test-data`,
        {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
        },
        body: JSON.stringify({
          content: content == null ? "" : String(content),
        }),
      });
      if (!data.ok) {
        throw new Error(data.error || "Save failed");
      }
      setMessage("Đã lưu creative-demos.json.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runVideoCompressTest = async () => {
    if (!canEdit || !videoFile) return;
    setCompressing(true);
    setVideoError(null);
    setVideoResult(null);
    const clientBytes = videoFile.size;
    if (clientBytes > MAX_VIDEO_BYTES) {
      setVideoError(
        `File vượt quá ${formatFileSize(MAX_VIDEO_BYTES)} (giới hạn API).`,
      );
      setCompressing(false);
      return;
    }
    const ext = videoFile.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = new Set(["mp4", "webm", "mov", "m4v"]);
    if (!allowed.has(ext)) {
      setVideoError("Chỉ thử nén: .mp4, .webm, .mov, .m4v");
      setCompressing(false);
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Không đọc được file."));
        reader.readAsDataURL(videoFile);
      });
      const base =
        videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `video.${ext}`;
      const savedName = `compress-test-${Date.now()}-${base}`;
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        name?: string;
        error?: string;
        video?: {
          originalBytes?: number;
          compressedBytes?: number;
          videoCompressed?: boolean;
        };
      }>(`${baseUrl}/api/file-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": role,
        },
        body: JSON.stringify({
          name: savedName,
          content: dataUrl,
          encoding: "base64",
        }),
      });
      if (!data.ok) {
        throw new Error(data.error || "Upload thất bại");
      }
      const v = data.video;
      setVideoResult({
        savedName: typeof data.name === "string" ? data.name : savedName,
        clientBytes,
        originalBytes:
          typeof v?.originalBytes === "number" ? v.originalBytes : clientBytes,
        compressedBytes:
          typeof v?.compressedBytes === "number"
            ? v.compressedBytes
            : clientBytes,
        videoCompressed: v?.videoCompressed === true,
      });
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setCompressing(false);
    }
  };

  const downloadCompressedVideo = async () => {
    if (!canEdit || !videoResult?.savedName) return;
    setDownloadingVideo(true);
    setVideoError(null);
    try {
      const url = new URL(`${baseUrl}/api/file-upload/file`);
      url.searchParams.set("name", videoResult.savedName);
      const res = await fetch(url.toString(), {
        headers: { "x-user-role": role },
      });
      if (!res.ok) {
        throw await backendErrorFromResponse(res);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = videoResult.savedName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setVideoError(
        err instanceof Error ? err.message : "Không tải được file từ server.",
      );
    } finally {
      setDownloadingVideo(false);
    }
  };

  return (
    <div className="w-full px-8 pt-10 space-y-6 pb-16">
      <header className="relative mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-[#4cceac]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                Test data (creative-demos.json)
              </h1>
              <p className="text-[#a3a3a3] text-xs font-medium mt-1 max-w-xl">
                Chỉnh sửa nội dung file{" "}
                <span className="text-white/90">
                  apps/server/src/data/creative-demos.json
                </span>
                . Chỉ tài khoản admin hoặc design được phép lưu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            Tải lại
          </button>
        </div>
        <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
          {message}
        </div>
      )}

      {!canEdit && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          Bạn chỉ có thể xem nội dung. Để lưu thay đổi cần quyền admin hoặc
          design.
        </div>
      )}

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <VideoCameraIcon className="w-5 h-5 text-[#4cceac]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-white uppercase tracking-tight italic">
              Thử nén video (server)
            </h2>
            <p className="text-[11px] text-[#a3a3a3] mt-0.5">
              Gửi file lên{" "}
              <code className="text-white/70 text-[10px]">
                POST /api/file-upload
              </code>{" "}
              — server chạy ffmpeg rồi lưu vào{" "}
              <code className="text-white/70 text-[10px]">
                uploads/file-center
              </code>
              . Tên file có tiền tố{" "}
              <code className="text-white/70 text-[10px]">compress-test-…</code>
              .
            </p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {canEdit ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] mb-2">
                    Chọn video
                  </span>
                  <input
                    type="file"
                    accept=".mp4,.webm,.mov,.m4v,video/mp4,video/webm,video/quicktime"
                    className="block w-full text-xs text-white/80 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/10 file:text-white hover:file:bg-white/15"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setVideoFile(f);
                      setVideoResult(null);
                      setVideoError(null);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!videoFile || compressing}
                  onClick={() => void runVideoCompressTest()}
                  className="shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {compressing ? "Đang nén…" : "Upload & nén thử"}
                </button>
              </div>
              {videoFile && (
                <p className="text-[11px] text-[#94a3b8]">
                  Trên máy: {formatFileSize(videoFile.size)} — {videoFile.name}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#a3a3a3]">
              Cần quyền admin hoặc design để gọi API upload và xem kết quả nén.
            </p>
          )}
          {videoError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {videoError}
            </div>
          )}
          {videoResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-50 space-y-2">
              <p className="font-semibold text-emerald-100">
                {videoResult.videoCompressed
                  ? "Đã nén và lưu file."
                  : "Giữ nguyên (đã nén sẵn, lỗi ffmpeg, hoặc không nhỏ hơn ngưỡng)."}
              </p>
              <ul className="font-mono text-[11px] space-y-1 text-emerald-100/90">
                <li>
                  Đã lưu:{" "}
                  <span className="text-white">{videoResult.savedName}</span>
                </li>
                <li>
                  Client (file gốc): {formatFileSize(videoResult.clientBytes)}
                </li>
                <li>
                  Server (sau decode):{" "}
                  {formatFileSize(videoResult.originalBytes)}
                </li>
                <li>
                  Sau xử lý: {formatFileSize(videoResult.compressedBytes)}
                  {videoResult.originalBytes > 0 && (
                    <span className="text-emerald-200/80 ml-2">
                      (
                      {(
                        (1 -
                          videoResult.compressedBytes /
                            videoResult.originalBytes) *
                        100
                      ).toFixed(1)}
                      % so với bản server decode)
                    </span>
                  )}
                </li>
              </ul>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void downloadCompressedVideo()}
                  disabled={downloadingVideo}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                  {downloadingVideo ? "Đang tải…" : "Tải video vừa nén"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
            JSON
          </span>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canEdit || saving || loading}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4cceac] text-[#141b2d] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        {loading ? (
          <div className="px-6 py-16 text-sm text-[#a3a3a3] text-center">
            Đang tải…
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={!canEdit}
            spellCheck={false}
            className="w-full min-h-[420px] bg-[#0d111a] text-white/90 text-sm font-mono leading-relaxed px-5 py-4 outline-none border-0 resize-y disabled:opacity-80"
            aria-label="Nội dung creative-demos.json"
          />
        )}
      </div>
    </div>
  );
};

export default TestData;
