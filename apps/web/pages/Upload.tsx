import React from "react";
import { useAuth } from "../contexts/AuthContext";

type DemoListItem = {
  id: string;
  title: string;
  category: string;
  value?: string;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["fla", "psd"]);

function webkitRelativePath(file: File): string | undefined {
  const w = file as File & { webkitRelativePath?: string };
  const p = w.webkitRelativePath;
  return typeof p === "string" && p.trim() ? p.trim() : undefined;
}

function hasAllowedUploadExtension(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_UPLOAD_EXTENSIONS.has(ext);
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
  const [selectedFolderFiles, setSelectedFolderFiles] = React.useState<File[]>(
    [],
  );
  const [selectedFolderName, setSelectedFolderName] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);
  const demoComboRef = React.useRef<HTMLDivElement | null>(null);

  const resetFolderForm = React.useCallback(() => {
    setSelectedFolderFiles([]);
    setSelectedFolderName("");
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  }, []);

  const loadFiles = React.useCallback(async () => {
    if (!canUpload) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/file-upload`, {
        headers: { "x-user-role": role },
      });
      const data = (await res.json()) as {
        ok?: boolean;
        files?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
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
        const res = await fetch(
          `${baseUrl}/api/creative-demo-titles?activeOnly=0`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          items?: DemoListItem[];
        };
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

  const handleFolderSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length === 0) {
      setError(null);
      setSelectedFolderFiles([]);
      setSelectedFolderName("");
      return;
    }
    const missingRel = list.filter((file) => !webkitRelativePath(file));
    if (missingRel.length > 0) {
      setError(
        "Choose a folder (not individual files) so each file keeps its path on SFTP.",
      );
      setSelectedFolderFiles([]);
      setSelectedFolderName("");
      return;
    }
    const oversizedFiles = list.filter(
      (file) => file.size > MAX_FILE_SIZE_BYTES,
    );
    const invalidTypeFiles = list.filter(
      (file) => !hasAllowedUploadExtension(file.name),
    );
    const validFiles = list.filter(
      (file) =>
        file.size <= MAX_FILE_SIZE_BYTES && hasAllowedUploadExtension(file.name),
    );
    if (invalidTypeFiles.length > 0) {
      setError(
        `Only .fla or .psd files are allowed. Invalid: ${invalidTypeFiles.map((f) => webkitRelativePath(f) ?? f.name).join(", ")}`,
      );
    } else if (oversizedFiles.length > 0) {
      setError(
        `Each file must be 20MB or smaller. Too large: ${oversizedFiles.map((f) => webkitRelativePath(f) ?? f.name).join(", ")}`,
      );
    } else {
      setError(null);
    }
    setSelectedFolderFiles(validFiles);
    if (validFiles.length === 0) {
      setSelectedFolderName("");
      return;
    }
    const firstRel = webkitRelativePath(validFiles[0]) ?? "";
    const slash = firstRel.indexOf("/");
    const rootName =
      slash > 0
        ? firstRel.slice(0, slash)
        : validFiles[0].name.replace(/\.[^.]+$/, "") || "folder-upload";
    setSelectedFolderName(rootName);
  };

  const handleUploadFolder = async () => {
    if (!selectedDemoId.trim()) {
      setError("Please select a creative demo");
      return;
    }
    if (selectedFolderFiles.length === 0 || !selectedFolderName.trim()) {
      setError("Please select a folder first");
      return;
    }

    setUploadingFolder(true);
    setMessage(null);
    setError(null);
    try {
      const payloadFiles = await Promise.all(
        selectedFolderFiles.map(async (file) => {
          const rel = webkitRelativePath(file);
          const relativePath = (rel ?? file.name).replace(/\\/g, "/");
          const content = await fileToBase64(file);
          return {
            relativePath,
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
        const res = await fetch(`${baseUrl}/api/file-upload/folder`, {
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
        const data = (await res.json()) as UploadFolderResponse;
        return { res, data };
      };

      let { res, data } = await uploadOnce(false);
      if (res.status === 409 && data.conflict) {
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
        ({ res, data } = await uploadOnce(true));
      }

      if (!res.ok || !data.ok) {
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
    <div className="w-full px-8 pt-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">
          File Upload
        </h1>
        <p className="text-sm text-[#a3a3a3] mt-1">
          Upload folders to server storage at <code>uploads/file-center</code>.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#020617] p-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
            Category filter
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-sm text-white outline-none focus:border-[#4cceac]/60"
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
                className="w-full rounded-xl border border-white/10 bg-[#0b1220] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-[#64748b] outline-none focus:border-[#4cceac]/60"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={
                  demoPickerOpen ? "Close demo list" : "Open demo list"
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDemoPickerOpen((o) => !o)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/10 hover:text-white"
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
              </button>
            </div>
            {demoPickerOpen && (
              <ul
                id="creative-demo-listbox"
                role="listbox"
                className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-[#0b1220] py-1 shadow-lg"
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
                      <button
                        type="button"
                        role="option"
                        aria-selected={item.id === selectedDemoId}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 ${
                          item.id === selectedDemoId
                            ? "bg-white/5 text-[#9ff3de]"
                            : "text-white"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickDemo(item)}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh list"}
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#020617] p-6">
        <h2 className="text-lg font-semibold text-white">Upload Folder</h2>
        <p className="text-xs text-[#94a3b8]">
          Select a folder: files upload directly to SFTP under the demo path
          (only .fla/.psd, same relative paths, max 20MB per file).
        </p>
        {!hasSelectedDemo && (
          <p className="text-xs text-amber-300">
            Please select Creative Demo Title before choosing a folder.
          </p>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-3">
          <input
            id="folder-upload-input"
            type="file"
            multiple
            ref={folderInputRef}
            onChange={handleFolderSelection}
            className="hidden"
            disabled={!hasSelectedDemo}
            {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          />
          <label
            htmlFor="folder-upload-input"
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              hasSelectedDemo
                ? "cursor-pointer border-[#4cceac]/30 bg-[#4cceac]/15 text-[#9ff3de] hover:bg-[#4cceac]/25"
                : "cursor-not-allowed border-white/10 bg-white/5 text-[#94a3b8]"
            }`}
          >
            Select folder
          </label>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {selectedFolderFiles.length > 0
              ? `${selectedFolderFiles.length} file(s) selected`
              : "No folder selected"}
          </p>
        </div>

        <div className="text-xs text-[#a3a3a3]">
          Folder:{" "}
          <span className="text-white">{selectedFolderName || "-"}</span> |
          Files:{" "}
          <span className="text-white">{selectedFolderFiles.length}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleUploadFolder()}
          disabled={
            uploadingFolder || selectedFolderFiles.length === 0 || !hasSelectedDemo
          }
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadingFolder ? "Uploading folder..." : "Upload folder"}
        </button>
      </section>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}

      <section className="rounded-3xl border border-white/10 bg-[#020617] p-6">
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
                className="rounded-xl border border-white/5 bg-[#0b1220] px-3 py-2 text-sm text-[#e5e7eb]"
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
