import React from "react";
import {
  FolderIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
  GlobeAltIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import brandColors from "../data/brandColors.json";
import bannerFormats from "../data/bannerFormats.json";

type SftpStatus = {
  ok: boolean;
  message: string;
} | null;

const BASE_REMOTE_PATH = "/script/demo";

const ManageDemo: React.FC = () => {
  const { user } = useAuth();
  const isAdsop = user?.role === "adsop" || user?.role === "adsopmanager";
  const [testingSftp, setTestingSftp] = React.useState(false);
  const [sftpStatus, setSftpStatus] = React.useState<SftpStatus>(null);
  const [remotePath, setRemotePath] = React.useState<string>(BASE_REMOTE_PATH);
  const [entries, setEntries] = React.useState<
    { name: string; type: string; size: number; modifyTime?: number }[]
  >([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [editorPath, setEditorPath] = React.useState<string | null>(null);
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorMode, setEditorMode] = React.useState<"view" | "edit">("view");
  const [savingFile, setSavingFile] = React.useState(false);

  const getFormatConfig = (path: string) => {
    const mapping = bannerFormats as {
      keyword: string;
      value: string;
      device?: "mb" | "pc";
    }[];
    const found = mapping.find((item) => path.includes(item.keyword));
    return {
      format: found?.value ?? "inpage-mb",
      device: found?.device ?? "mb",
    };
  };

  const getParentPath = () => {
    const trimmed = remotePath.endsWith("/")
      ? remotePath.slice(0, -1)
      : remotePath;

    if (trimmed === "/" || trimmed === BASE_REMOTE_PATH) {
      return null;
    }

    const lastSlash = trimmed.lastIndexOf("/");
    if (lastSlash <= 0) {
      return "/";
    }

    return trimmed.slice(0, lastSlash) || "/";
  };

  const handleGoUpDirectory = () => {
    const parent = getParentPath();
    if (!parent) return;
    void handleLoadDirectory(parent);
  };

  const buildRemoteRelativePath = (fullPath: string) => {
    if (fullPath.startsWith(BASE_REMOTE_PATH)) {
      return fullPath.slice(BASE_REMOTE_PATH.length).replace(/^\/+/, "");
    }
    return fullPath.replace(/^\/+/, "");
  };

  const handleTestSftp = async () => {
    setTestingSftp(true);
    setSftpStatus(null);

    try {
      const baseUrl =
        import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

      const response = await fetch(`${baseUrl}/api/sftp/connect`);
      const data = await response.json();

      if (response.ok && data.ok) {
        const message = `Connected to ${data.host}:${data.port}${
          data.cwd ? ` (cwd: ${data.cwd})` : ""
        }`;
        setSftpStatus({ ok: true, message });
      } else {
        setSftpStatus({
          ok: false,
          message: data.error || "Unknown error",
        });
      }
    } catch (err) {
      setSftpStatus({
        ok: false,
        message: err instanceof Error ? err.message : "Unknown network error",
      });
    } finally {
      setTestingSftp(false);
    }
  };

  const handleLoadDirectory = async (pathOverride?: string) => {
    const targetPath = (pathOverride ?? remotePath) || "/";
    setRemotePath(targetPath);
    setLoadingList(true);
    try {
      const baseUrl =
        import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
      const response = await fetch(
        `${baseUrl}/api/sftp/list?path=${encodeURIComponent(targetPath)}`,
      );
      const data = await response.json();
      if (response.ok && data.ok) {
        const list = (data.entries as typeof entries) ?? [];
        const filtered = list.filter(
          (e) => !e.name.startsWith(".") && !e.name.startsWith(".bash"),
        );
        const sorted = filtered.slice().sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();

          const isDirA = a.type === "d";
          const isDirB = b.type === "d";
          const startsWithDigitA = /^[0-9]/.test(nameA);
          const startsWithDigitB = /^[0-9]/.test(nameB);

          // Đẩy các thư mục có tên bắt đầu bằng số (ví dụ 2019, 2020...)
          // lên trước, sau đó mới đến các mục còn lại theo thứ tự A-Z.
          const isNumericDirA = isDirA && startsWithDigitA;
          const isNumericDirB = isDirB && startsWithDigitB;

          if (isNumericDirA && !isNumericDirB) return -1;
          if (!isNumericDirA && isNumericDirB) return 1;

          return nameA.localeCompare(nameB);
        });
        setEntries(sorted);
      } else {
        setEntries([]);
        setSftpStatus({
          ok: false,
          message: data.error || "Unable to list directory",
        });
      }
    } catch (err) {
      setEntries([]);
      setSftpStatus({
        ok: false,
        message: err instanceof Error ? err.message : "Unknown network error",
      });
    } finally {
      setLoadingList(false);
    }
  };

  const handleOpenDemo = () => {
    const relative = buildRemoteRelativePath(remotePath);
    const bannerPath = relative
      ? `${relative.replace(/\/+$/, "")}/index.html`
      : "index.html";

    const { format: formatParam, device } = getFormatConfig(bannerPath);
    const isPcFormat = device === "pc";
    const previewBase = `https://demo.yomedia.vn/yomedia/site/id${
      isPcFormat ? "pc" : "mb"
    }/index.html`;
    const url = `${previewBase}?f=${formatParam}&b=${bannerPath}&l=lt&c=demo`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenBanner = () => {
    const relative = buildRemoteRelativePath(remotePath);
    const baseUrl = "https://demo.yomedia.vn";
    const url = relative ? `${baseUrl}/${relative}` : baseUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getBrandColorClass = (name: string) => {
    const lower = name.toLowerCase();
    const match = (
      brandColors as {
        keyword: string;
        className: string;
        match?: "start" | "any";
      }[]
    ).find((item) => {
      const kw = item.keyword.toLowerCase();
      if (!kw) return false;
      if (item.match === "start") {
        return lower.startsWith(kw);
      }
      return lower.includes(kw);
    });
    return match?.className || "text-[#e5e7eb]";
  };

  React.useEffect(() => {
    // Load default directory on first mount
    handleLoadDirectory(remotePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full px-8 pt-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">
          Manage Demo
        </h1>
        <p className="text-sm text-[#a3a3a3] max-w-xl">
          Use this panel to verify connectivity to the SFTP server and manage
          demo assets stored on SFTP.
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4cceac]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
              Remote directory
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#64748b]">
            <span>Path on SFTP server</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={buildRemoteRelativePath(remotePath)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const full =
                raw === ""
                  ? BASE_REMOTE_PATH
                  : `${BASE_REMOTE_PATH}/${raw.replace(/^\/+/, "")}`;
              setRemotePath(full);
            }}
            className="flex-1 bg-[#020617] border border-white/5 rounded-2xl px-4 py-2.5 text-xs text-[#e5e7eb] outline-none focus:border-[#4cceac]/60 transition-colors"
            placeholder="2019/01/demo-name"
          />
          <button
            type="button"
            onClick={handleGoUpDirectory}
            disabled={!getParentPath() || loadingList}
            className="px-4 py-2.5 rounded-2xl bg-white/5 text-[#e5e7eb] text-[10px] font-semibold uppercase tracking-widest hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={handleOpenBanner}
            className="px-4 py-2.5 rounded-2xl bg-[#1d4ed8] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Banner
          </button>
          <button
            onClick={handleOpenDemo}
            className="px-4 py-2.5 rounded-2xl bg-[#4cceac] text-[#020617] text-xs font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            demo
          </button>
        </div>

        <div className="mt-2 rounded-3xl border border-[#1f2937] bg-[#020617] overflow-hidden shadow-lg">
          <div className="border-b border-[#1f2937] px-4 py-3 text-[12px] font-semibold text-[#9ca3af] grid grid-cols-12 bg-[#020617]/80 backdrop-blur-sm">
            <div className="col-span-6">Name</div>
            <div className="col-span-2 text-center">Type</div>
            <div className="col-span-2 text-right">Size</div>
            <div className="col-span-1 text-right">Modified</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="max-h-[32rem] overflow-y-auto text-[12px] text-[#e5e7eb]">
            {entries.length === 0 ? (
              <div className="px-4 py-4 text-center text-[#6b7280]">
                No entries loaded. Choose a path and click{" "}
                <span className="text-[#4cceac] font-semibold">Demo</span> to
                open the demo in a new tab.
              </div>
            ) : (
              entries.map((item) => {
                const isDir = item.type === "d";
                const isViewableFile =
                  !isDir &&
                  (item.name.endsWith(".html") ||
                    item.name.endsWith(".htm") ||
                    item.name.endsWith(".js"));
                const ext = isDir
                  ? ""
                  : (item.name.split(".").pop()?.toLowerCase() ?? "");

                return (
                  <div
                    key={item.name}
                    className="px-4 py-2 grid grid-cols-12 border-t border-[#020617] hover:bg-white/5 cursor-pointer transition-colors"
                    onDoubleClick={() => {
                      if (isDir) {
                        const base = remotePath.endsWith("/")
                          ? remotePath.slice(0, -1)
                          : remotePath;
                        const nextPath =
                          base === "/"
                            ? `/${item.name}`
                            : `${base}/${item.name}`;
                        void handleLoadDirectory(nextPath);
                      }
                    }}
                  >
                    <div
                      className={`col-span-6 truncate ${getBrandColorClass(item.name)}`}
                    >
                      {item.name}
                    </div>
                    <div className="col-span-2 flex items-center justify-center text-[#9ca3af]">
                      {isDir ? (
                        <FolderIcon className="w-4 h-4" />
                      ) : ext === "html" || ext === "htm" ? (
                        <GlobeAltIcon className="w-4 h-4" />
                      ) : ext === "js" || ext === "ts" ? (
                        <CodeBracketIcon className="w-4 h-4" />
                      ) : ext === "php" ? (
                        <CodeBracketIcon className="w-4 h-4" />
                      ) : ext === "txt" || ext === "xml" ? (
                        <DocumentTextIcon className="w-4 h-4" />
                      ) : ext === "zip" ||
                        ext === "rar" ||
                        ext === "7z" ||
                        ext === "tar" ? (
                        <ArchiveBoxIcon className="w-4 h-4" />
                      ) : (
                        <QuestionMarkCircleIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="col-span-2 text-right text-[#9ca3af]">
                      {isDir ? "-" : item.size}
                    </div>
                    <div className="col-span-1 text-right text-[#6b7280]">
                      {item.modifyTime
                        ? new Date(item.modifyTime).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {isViewableFile && !isAdsop && (
                        <>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-[#e5e7eb] hover:bg-white/10"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const baseUrl =
                                import.meta.env.VITE_SERVER_URL ||
                                "http://localhost:3000";
                              const base = remotePath.endsWith("/")
                                ? remotePath.slice(0, -1)
                                : remotePath;
                              const fullPath =
                                base === "/"
                                  ? `/${item.name}`
                                  : `${base}/${item.name}`;
                              try {
                                const res = await fetch(
                                  `${baseUrl}/api/sftp/read?path=${encodeURIComponent(
                                    fullPath,
                                  )}`,
                                );
                                const data = await res.json();
                                if (res.ok && data.ok) {
                                  setEditorPath(fullPath);
                                  setEditorContent(data.content ?? "");
                                  setEditorMode("view");
                                } else {
                                  setSftpStatus({
                                    ok: false,
                                    message:
                                      data.error ||
                                      "Unable to read file content",
                                  });
                                }
                              } catch (err) {
                                setSftpStatus({
                                  ok: false,
                                  message:
                                    err instanceof Error
                                      ? err.message
                                      : "Unknown network error",
                                });
                              }
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 rounded-md bg-[#4cceac]/10 text-[10px] text-[#4cceac] hover:bg-[#4cceac]/20"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const baseUrl =
                                import.meta.env.VITE_SERVER_URL ||
                                "http://localhost:3000";
                              const base = remotePath.endsWith("/")
                                ? remotePath.slice(0, -1)
                                : remotePath;
                              const fullPath =
                                base === "/"
                                  ? `/${item.name}`
                                  : `${base}/${item.name}`;
                              try {
                                const res = await fetch(
                                  `${baseUrl}/api/sftp/read?path=${encodeURIComponent(
                                    fullPath,
                                  )}`,
                                );
                                const data = await res.json();
                                if (res.ok && data.ok) {
                                  setEditorPath(fullPath);
                                  setEditorContent(data.content ?? "");
                                  setEditorMode("edit");
                                } else {
                                  setSftpStatus({
                                    ok: false,
                                    message:
                                      data.error ||
                                      "Unable to read file content",
                                  });
                                }
                              } catch (err) {
                                setSftpStatus({
                                  ok: false,
                                  message:
                                    err instanceof Error
                                      ? err.message
                                      : "Unknown network error",
                                });
                              }
                            }}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {editorPath && (
        <div className="mt-6 rounded-3xl border border-[#1f2937] bg-[#020617] p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a3a3a3]">
                {editorMode === "edit" ? "Edit file" : "View file"}
              </span>
              <span className="text-xs text-[#e5e7eb] truncate max-w-[420px]">
                {editorPath}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {editorMode === "edit" && (
                <button
                  type="button"
                  disabled={savingFile}
                  onClick={async () => {
                    if (!editorPath) return;
                    setSavingFile(true);
                    try {
                      const baseUrl =
                        import.meta.env.VITE_SERVER_URL ||
                        "http://localhost:3000";
                      const res = await fetch(`${baseUrl}/api/sftp/write`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          path: editorPath,
                          content: editorContent,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok || !data.ok) {
                        setSftpStatus({
                          ok: false,
                          message:
                            data.error ||
                            "Unable to save file content to SFTP server",
                        });
                      } else {
                        setSftpStatus({
                          ok: true,
                          message: `Saved file ${editorPath}`,
                        });
                      }
                    } catch (err) {
                      setSftpStatus({
                        ok: false,
                        message:
                          err instanceof Error
                            ? err.message
                            : "Unknown network error",
                      });
                    } finally {
                      setSavingFile(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#4cceac] text-[#020617] text-[10px] font-semibold uppercase tracking-widest hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingFile ? "Saving…" : "Save changes"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditorPath(null);
                  setEditorContent("");
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-[10px] text-[#e5e7eb] uppercase tracking-widest hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
          <textarea
            value={editorContent}
            onChange={(e) =>
              editorMode === "edit"
                ? setEditorContent(e.target.value)
                : undefined
            }
            readOnly={editorMode === "view"}
            className="w-full min-h-[320px] bg-[#020617] border border-[#1f2937] rounded-2xl px-4 py-3 text-sm font-mono text-[#e5e7eb] resize-vertical outline-none focus:border-[#4cceac]/60"
          />
        </div>
      )}

      {sftpStatus && (
        <div className="fixed top-4 right-4 z-50">
          <div className="w-80 rounded-2xl bg-[#020617] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#4cceac]/10 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <div
                className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${
                  sftpStatus.ok
                    ? "bg-[#4cceac]/20 text-[#4cceac]"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                <span className="text-lg">{sftpStatus.ok ? "✓" : "!"}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-semibold text-white">
                      {sftpStatus.ok
                        ? "SFTP Connected"
                        : "SFTP Connection Failed"}
                    </h2>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      {sftpStatus.ok
                        ? "Connection established successfully."
                        : "Unable to reach the SFTP endpoint."}
                    </p>
                  </div>
                  <button
                    onClick={() => setSftpStatus(null)}
                    className="text-[#64748b] hover:text-white text-xs"
                    aria-label="Close notification"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#e5e7eb] break-words leading-relaxed">
                  {sftpStatus.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDemo;
