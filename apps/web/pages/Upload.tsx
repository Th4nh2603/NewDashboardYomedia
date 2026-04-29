import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";
import Button from "../components/Button";

type DemoListItem = {
  id: string;
  title: string;
  category: string;
  value?: string;
  fla?: boolean;
};

/** Mỗi file tối đa (không vượt quá tổng batch). */
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;
/** Tổng dung lượng mọi file trong một lần upload. */
const MAX_BATCH_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["fla", "psd"]);

function hasAllowedUploadExtension(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_UPLOAD_EXTENSIONS.has(ext);
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

type FolderUploadItem = { file: File; relativePath: string };

/** Đọc hết batch từ DirectoryReader (Chrome trả tối đa ~100 entry mỗi lần). */
function readAllDirEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const acc: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(acc);
            return;
          }
          acc.push(...batch);
          readBatch();
        },
        (err) => reject(err),
      );
    };
    readBatch();
  });
}

function collectFilesFromEntry(
  entry: FileSystemEntry,
  pathPrefix: string,
): Promise<FolderUploadItem[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file: File) => {
          const relativePath = `${pathPrefix}${file.name}`.replace(/\\/g, "/");
          resolve([{ file, relativePath }]);
        },
        (err) => reject(err),
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const dirPath = `${pathPrefix}${entry.name}/`;
      void readAllDirEntries(reader)
        .then(async (entries) => {
          const nested = await Promise.all(
            entries.map((e) => collectFilesFromEntry(e, dirPath)),
          );
          resolve(nested.flat());
        })
        .catch(reject);
    } else {
      resolve([]);
    }
  });
}

/** File giả (0 byte, không đuôi) khi kéo thả folder trên một số bản Chrome/Windows. */
function isDroppedFolderPlaceholder(file: File): boolean {
  if (file.size !== 0) return false;
  const base = file.name.split(/[/\\]/).pop() ?? file.name;
  if (base.includes(".")) return false;
  const t = file.type || "";
  if (t !== "" && t !== "application/octet-stream") return false;
  return true;
}

const Upload: React.FC = () => {
  const { user } = useAuth();
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const role = (user?.role || "").toLowerCase();
  const canUpload = role === "admin" || role === "design";

  const [demoItems, setDemoItems] = React.useState<DemoListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [demoComboInput, setDemoComboInput] = React.useState("");
  const [demoPickerOpen, setDemoPickerOpen] = React.useState(false);
  const [selectedDemoId, setSelectedDemoId] = React.useState("");
  const [files, setFiles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploadingFolder, setUploadingFolder] = React.useState(false);
  const [selectedFolderItems, setSelectedFolderItems] = React.useState<
    FolderUploadItem[]
  >([]);
  const [selectedFolderName, setSelectedFolderName] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isFolderDropActive, setIsFolderDropActive] = React.useState(false);
  const demoComboRef = React.useRef<HTMLDivElement | null>(null);
  const folderDropDepthRef = React.useRef(0);

  const resetFolderForm = React.useCallback(() => {
    setSelectedFolderItems([]);
    setSelectedFolderName("");
  }, []);

  const loadFiles = React.useCallback(async () => {
    if (!canUpload) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJsonOrThrow<{
        ok?: boolean;
        files?: string[];
        error?: string;
      }>(`${baseUrl}/api/file-upload`, {
        headers: { "x-user-role": role },
      });
      if (!data.ok) {
        throw new Error(data.error || "Unable to load uploaded files");
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load uploaded files",
      );
    } finally {
      setLoading(false);
    }
  }, [baseUrl, canUpload, role]);

  React.useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  React.useEffect(() => {
    if (!canUpload) return;
    const loadDemoTitles = async () => {
      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          items?: DemoListItem[];
        }>(
          `${baseUrl}/api/creative-demo-titles?activeOnly=0`,
        );
        const items = Array.isArray(data.items) ? data.items : [];
        setDemoItems(items);
      } catch {
        setDemoItems([]);
      }
    };
    void loadDemoTitles();
  }, [canUpload, baseUrl]);

  /** Distinct category values from API (trim + case-insensitive dedupe), plus "all". */
  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of demoItems) {
      const c = item.category.trim();
      if (!c) continue;
      const key = c.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(c);
    }
    return ["all", ...list];
  }, [demoItems]);

  const filteredDemos = React.useMemo(() => {
    if (selectedCategory === "all") return demoItems;
    const want = selectedCategory.trim().toLowerCase();
    return demoItems.filter(
      (item) => item.category.trim().toLowerCase() === want,
    );
  }, [demoItems, selectedCategory]);

  const demosListFiltered = React.useMemo(() => {
    const raw = demoComboInput.trim().toLowerCase();
    if (!raw) return filteredDemos;
    const tokens = raw.split(/\s+/).filter((t) => t.length >= 2);
    const matchesItem = (item: DemoListItem) => {
      const value = (item.value ?? "").toLowerCase();
      const haystack = [item.title, item.id, value].join(" ").toLowerCase();
      if (tokens.length === 0) {
        return haystack.includes(raw);
      }
      if (tokens.length === 1) {
        const t = tokens[0];
        return (
          haystack.includes(t) ||
          value.replace(/-/g, "").includes(t.replace(/-/g, ""))
        );
      }
      return tokens.every((t) => haystack.includes(t));
    };
    return filteredDemos.filter(matchesItem);
  }, [filteredDemos, demoComboInput]);

  React.useEffect(() => {
    if (filteredDemos.length === 0) {
      setSelectedDemoId("");
      return;
    }
    if (selectedDemoId && !filteredDemos.some((d) => d.id === selectedDemoId)) {
      setSelectedDemoId("");
      setDemoComboInput("");
    }
  }, [filteredDemos, selectedDemoId]);

  React.useEffect(() => {
    if (demoPickerOpen) return;
    const item = filteredDemos.find((d) => d.id === selectedDemoId);
    if (item) setDemoComboInput(item.title);
    else if (filteredDemos.length === 0) setDemoComboInput("");
  }, [selectedDemoId, filteredDemos, demoPickerOpen]);

  React.useEffect(() => {
    setDemoPickerOpen(false);
  }, [selectedCategory]);

  React.useEffect(() => {
    if (!demoPickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = demoComboRef.current;
      if (el && !el.contains(e.target as Node)) {
        setDemoPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [demoPickerOpen]);

  const pickDemo = React.useCallback((item: DemoListItem) => {
    setSelectedDemoId(item.id);
    setDemoComboInput(item.title);
    setDemoPickerOpen(false);
  }, []);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(`Cannot read ${file.name}`));
      reader.readAsDataURL(file);
    });
  const hasSelectedDemo = Boolean(selectedDemoId.trim());

  const stagedTotalBytes = React.useMemo(
    () => selectedFolderItems.reduce((s, it) => s + it.file.size, 0),
    [selectedFolderItems],
  );

  const applyFolderItems = React.useCallback((items: FolderUploadItem[]) => {
    if (items.length === 0) {
      setError(null);
      setSelectedFolderItems([]);
      setSelectedFolderName("");
      return;
    }
    const oversizedFiles = items.filter(
      (it) => it.file.size > MAX_FILE_SIZE_BYTES,
    );
    const invalidTypeFiles = items.filter(
      (it) => !hasAllowedUploadExtension(it.file.name),
    );
    const validItems = items.filter(
      (it) =>
        it.file.size <= MAX_FILE_SIZE_BYTES &&
        hasAllowedUploadExtension(it.file.name),
    );
    const batchTotal = validItems.reduce((s, it) => s + it.file.size, 0);
    if (invalidTypeFiles.length > 0) {
      setError(
        `Only .fla or .psd files are allowed. Invalid: ${invalidTypeFiles.map((it) => it.relativePath).join(", ")}`,
      );
    } else if (oversizedFiles.length > 0) {
      setError(
        `Each file must be 30MB or smaller. Too large: ${oversizedFiles.map((it) => it.relativePath).join(", ")}`,
      );
    } else if (validItems.length > 0 && batchTotal > MAX_BATCH_TOTAL_BYTES) {
      setError(
        `Total size of selected files must be 30MB or less (currently ${formatFileSize(batchTotal)}).`,
      );
    } else {
      setError(null);
    }

    if (validItems.length > 0 && batchTotal > MAX_BATCH_TOTAL_BYTES) {
      setSelectedFolderItems([]);
      setSelectedFolderName("");
      return;
    }

    setSelectedFolderItems(validItems);
    if (validItems.length === 0) {
      setSelectedFolderName("");
      return;
    }
    const firstRel = validItems[0].relativePath;
    const slash = firstRel.indexOf("/");
    const rootName =
      slash > 0
        ? firstRel.slice(0, slash)
        : validItems[0].file.name.replace(/\.[^.]+$/, "") || "folder-upload";
    setSelectedFolderName(rootName);
  }, []);

  const handleFolderDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      folderDropDepthRef.current = 0;
      setIsFolderDropActive(false);
      if (!hasSelectedDemo) {
        setError("Please select a creative demo before dropping files.");
        return;
      }

      type DropSnap =
        | { kind: "entry"; entry: FileSystemEntry }
        | { kind: "file"; file: File };

      const fileListFallback = Array.from(e.dataTransfer.files ?? []).filter(
        (f) => !isDroppedFolderPlaceholder(f),
      );

      const snapshots: DropSnap[] = [];
      const items = e.dataTransfer.items;
      if (items?.length) {
        for (let i = 0; i < items.length; i++) {
          const dtItem = items[i];
          const entry = (
            dtItem as DataTransferItem & {
              webkitGetAsEntry?: () => FileSystemEntry | null;
            }
          ).webkitGetAsEntry?.();
          if (entry) {
            snapshots.push({ kind: "entry", entry });
          } else if (dtItem.kind === "file") {
            const f = dtItem.getAsFile();
            if (f && !isDroppedFolderPlaceholder(f)) {
              snapshots.push({ kind: "file", file: f });
            }
          }
        }
      }

      const collected: FolderUploadItem[] = [];

      for (const snap of snapshots) {
        if (snap.kind === "entry") {
          try {
            // File lẻ: path = tên file (không thêm thư mục ảo); thư mục: giữ cây như Explorer.
            const fromEntry = await collectFilesFromEntry(snap.entry, "");
            collected.push(...fromEntry);
          } catch {
            /* ignore broken entry */
          }
        } else {
          collected.push({
            file: snap.file,
            relativePath: snap.file.name.replace(/\\/g, "/"),
          });
        }
      }

      for (const file of fileListFallback) {
        const already = collected.some((it) => it.file === file);
        if (!already) {
          collected.push({
            file,
            relativePath: file.name.replace(/\\/g, "/"),
          });
        }
      }

      const dedupe = new Map<string, FolderUploadItem>();
      for (const it of collected) {
        const key = `${it.relativePath}\0${it.file.size}\0${it.file.lastModified}`;
        if (!dedupe.has(key)) dedupe.set(key, it);
      }
      const merged = [...dedupe.values()];

      if (merged.length === 0) return;
      applyFolderItems(merged);
    },
    [applyFolderItems, hasSelectedDemo],
  );

  const handleUploadFolder = async () => {
    if (!selectedDemoId.trim()) {
      setError("Please select a creative demo");
      return;
    }
    if (selectedFolderItems.length === 0 || !selectedFolderName.trim()) {
      setError("Please select a folder first");
      return;
    }
    if (stagedTotalBytes > MAX_BATCH_TOTAL_BYTES) {
      setError(
        `Total size must be 30MB or less (currently ${formatFileSize(stagedTotalBytes)}).`,
      );
      return;
    }

    setUploadingFolder(true);
    setMessage(null);
    setError(null);
    try {
      const payloadFiles = await Promise.all(
        selectedFolderItems.map(async ({ file, relativePath }) => {
          const content = await fileToBase64(file);
          return {
            relativePath: relativePath.replace(/\\/g, "/"),
            content,
            encoding: "base64" as const,
          };
        }),
      );

      type UploadFolderResponse = {
        ok?: boolean;
        uploaded?: number;
        folderName?: string;
        error?: string;
        testJsonUpdated?: boolean;
        creativeDemosUpdated?: boolean;
        conflict?: boolean;
        existingPaths?: string[];
      };
      const uploadOnce = async (overwrite: boolean) => {
        const data = await fetchJsonOrThrow<UploadFolderResponse>(
          `${baseUrl}/api/file-upload/folder`,
          {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": role,
          },
          body: JSON.stringify({
            folderName: selectedFolderName.trim(),
            files: payloadFiles,
            demoId: selectedDemoId,
            categoryFilter: selectedCategory,
            overwrite,
          }),
        });
        return data;
      };

      let data = await uploadOnce(false);
      if (data.conflict) {
        const conflictList = Array.isArray(data.existingPaths)
          ? data.existingPaths.join("\n")
          : "";
        const shouldOverwrite = window.confirm(
          `File da ton tai tren SFTP:\n${conflictList}\n\nBan co muon ghi de khong?`,
        );
        if (!shouldOverwrite) {
          resetFolderForm();
          setMessage("Upload cancelled. Form has been reset.");
          return;
        }
        data = await uploadOnce(true);
      }

      if (!data.ok) {
        throw new Error(data.error || "Folder upload failed");
      }

      const baseMsg = `Uploaded ${data.uploaded || payloadFiles.length} file(s) to folder ${data.folderName || selectedFolderName}.`;
      const extraMessages: string[] = [];
      if (data.testJsonUpdated) {
        extraMessages.push(
          "Da ghi cac field upload vao apps/server/src/data/test.json.",
        );
      }
      if (data.creativeDemosUpdated) {
        extraMessages.push(
          "Da cap nhat fla=true trong apps/server/src/data/creative-demos.json.",
        );
      }
      setMessage(
        extraMessages.length > 0
          ? `${baseMsg} ${extraMessages.join(" ")}`
          : baseMsg,
      );
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Folder upload failed");
    } finally {
      setUploadingFolder(false);
    }
  };

  if (!canUpload) {
    return (
      <div className="w-full px-8 pt-10">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h1 className="text-xl font-bold text-rose-300">
            Upload Permission Denied
          </h1>
          <p className="mt-2 text-sm text-rose-200/80">
            This feature is only available for admin or design roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-6 pb-8 pt-8 md:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-[#0b1220] to-[#111827] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.55)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#4cceac]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" />
        <h1 className="relative text-3xl font-bold tracking-tight text-slate-100">
          File Upload
        </h1>
        <p className="relative mt-2 text-sm text-slate-300/80">
          Upload folders to server storage at <code>uploads/file-center</code>.
        </p>
      </header>

      <section className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b1220] to-[#020617] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.35)]">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
            Category filter
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All categories" : category}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="creative-demo-combo"
            className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]"
          >
            Creative Demo Title
          </label>
          <div className="relative" ref={demoComboRef}>
            <div className="relative">
              <input
                id="creative-demo-combo"
                type="text"
                value={demoComboInput}
                onChange={(e) => {
                  setDemoComboInput(e.target.value);
                  setDemoPickerOpen(true);
                }}
                onFocus={() => setDemoPickerOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDemoPickerOpen(false);
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "Enter") {
                    const first = demosListFiltered[0];
                    if (first) pickDemo(first);
                    e.preventDefault();
                  }
                }}
                placeholder="Search or select a demo..."
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={demoPickerOpen}
                aria-controls="creative-demo-listbox"
                aria-autocomplete="list"
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-[#64748b] shadow-inner shadow-black/20 outline-none transition focus:border-[#4cceac]/60 focus:ring-2 focus:ring-[#4cceac]/20"
              />
              <Button
                type="button"
                tabIndex={-1}
                aria-label={
                  demoPickerOpen ? "Close demo list" : "Open demo list"
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDemoPickerOpen((o) => !o)}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#94a3b8] hover:text-white"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${demoPickerOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </div>
            {demoPickerOpen && (
              <ul
                id="creative-demo-listbox"
                role="listbox"
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900/95 py-1 shadow-2xl backdrop-blur"
              >
                {demosListFiltered.length === 0 ? (
                  <li className="px-4 py-2.5 text-sm text-[#94a3b8]">
                    {filteredDemos.length === 0
                      ? "No title available"
                      : "No matches"}
                  </li>
                ) : (
                  demosListFiltered.map((item) => (
                    <li key={item.id} role="presentation">
                      <Button
                        type="button"
                        role="option"
                        aria-selected={item.id === selectedDemoId}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/10 ${
                          item.id === selectedDemoId
                            ? "bg-white/5 text-[#9ff3de]"
                            : "text-white"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickDemo(item)}
                      >
                        <span className="min-w-0 truncate">{item.title}</span>
                        {item.fla ? (
                          <span
                            className="shrink-0 text-sm font-semibold text-emerald-300"
                            aria-label="Has FLA"
                            title="Has FLA"
                          >
                            ✔
                          </span>
                        ) : (
                          <span className="shrink-0 opacity-0">✔</span>
                        )}
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            variant="secondary"
            size="md"
            className="border border-white/10 text-sm normal-case tracking-normal hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? "Refreshing..." : "Refresh list"}
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b1220] to-[#020617] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.35)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Upload Folder</h2>
          <span className="rounded-full border border-[#4cceac]/30 bg-[#4cceac]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#9ff3de]">
            .fla / .psd only
          </span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Drag-and-drop a folder or multiple .fla/.psd files to SFTP under the
          demo path. Max 30MB per file, max 30MB total per upload; dropped
          folders keep relative paths.
        </p>
        {!hasSelectedDemo && (
          <p className="text-xs text-amber-300">
            Please select Creative Demo Title before dropping files here.
          </p>
        )}

        <div
          className={`rounded-2xl border border-dashed p-5 transition ${
            !hasSelectedDemo
              ? "border-white/10 bg-slate-900/60 opacity-80"
              : isFolderDropActive
                ? "border-[#4cceac]/70 bg-[#4cceac]/10 shadow-[0_0_0_4px_rgba(76,206,172,0.18)]"
                : "border-white/10 bg-slate-900/70 hover:border-[#4cceac]/40"
          }`}
          onDragEnter={(e) => {
            if (!hasSelectedDemo) return;
            e.preventDefault();
            e.stopPropagation();
            folderDropDepthRef.current += 1;
            setIsFolderDropActive(true);
          }}
          onDragLeave={(e) => {
            if (!hasSelectedDemo) return;
            e.preventDefault();
            e.stopPropagation();
            folderDropDepthRef.current -= 1;
            if (folderDropDepthRef.current <= 0) {
              folderDropDepthRef.current = 0;
              setIsFolderDropActive(false);
            }
          }}
          onDragOver={(e) => {
            if (!hasSelectedDemo) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => void handleFolderDrop(e)}
        >
          <p className="text-sm leading-relaxed text-[#cbd5e1]">
            {hasSelectedDemo ? (
              <>
                Kéo thả thư mục hoặc nhiều file{" "}
                <span className="text-[#9ff3de]">.fla</span> /{" "}
                <span className="text-[#9ff3de]">.psd</span> vào vùng này (tổng
                tối đa 30MB).
              </>
            ) : (
              "Chọn Creative Demo Title trước, sau đó kéo thả file hoặc thư mục vào đây."
            )}
          </p>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {selectedFolderItems.length > 0
              ? `${selectedFolderItems.length} file(s) · total ${formatFileSize(stagedTotalBytes)} / ${formatFileSize(MAX_BATCH_TOTAL_BYTES)}`
              : "No files selected"}
          </p>
          {selectedFolderItems.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                Files staged (path · size)
              </p>
              <ul
                className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/5 bg-[#020617]/80 p-2"
                aria-label="Selected files for upload"
              >
                {selectedFolderItems.map((it, idx) => (
                  <li
                    key={`${it.relativePath}\0${it.file.size}\0${it.file.lastModified}\0${idx}`}
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/[0.04]"
                  >
                    <span
                      className="min-w-0 break-all text-[#e2e8f0]"
                      title={it.file.name}
                    >
                      {it.relativePath}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#94a3b8]">
                      {formatFileSize(it.file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-[#a3a3a3] sm:grid-cols-3">
          <p>
            Folder: <span className="text-white">{selectedFolderName || "-"}</span>
          </p>
          <p>
            Files: <span className="text-white">{selectedFolderItems.length}</span>
          </p>
          <p>
            Total:{" "}
            <span
              className={
                stagedTotalBytes > MAX_BATCH_TOTAL_BYTES
                  ? "text-rose-400"
                  : "text-white"
              }
            >
              {formatFileSize(stagedTotalBytes)}
            </span>{" "}
            / {formatFileSize(MAX_BATCH_TOTAL_BYTES)}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void handleUploadFolder()}
          disabled={
            uploadingFolder ||
            selectedFolderItems.length === 0 ||
            !hasSelectedDemo
          }
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {uploadingFolder ? "Uploading folder..." : "Upload folder"}
        </Button>
      </section>

      {message && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b1220] to-[#020617] p-6 shadow-[0_10px_40px_rgba(2,6,23,0.35)]">
        <h2 className="text-lg font-semibold text-white">Uploaded Files</h2>
        {loading ? (
          <p className="mt-3 text-sm text-[#94a3b8]">Loading files...</p>
        ) : files.length === 0 ? (
          <p className="mt-3 text-sm text-[#94a3b8]">No files uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {files.map((file) => (
              <li
                key={file}
                className="rounded-xl border border-white/5 bg-slate-900/80 px-3 py-2 text-sm text-[#e5e7eb] transition hover:border-[#4cceac]/30 hover:bg-slate-900"
              >
                {file}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Upload;
