import React from "react";
import { useAuth } from "../contexts/AuthContext";

type DemoListItem = { id: string; title: string; category: string };

const Upload: React.FC = () => {
  const { user } = useAuth();
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  const role = (user?.role || "").toLowerCase();
  const canUpload = role === "admin" || role === "design";

  const [demoItems, setDemoItems] = React.useState<DemoListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedDemoId, setSelectedDemoId] = React.useState("");
  const [files, setFiles] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploadingFolder, setUploadingFolder] = React.useState(false);
  const [selectedFolderFiles, setSelectedFolderFiles] = React.useState<File[]>([]);
  const [selectedFolderName, setSelectedFolderName] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);

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
      const data = (await res.json()) as { ok?: boolean; files?: string[]; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to load uploaded files");
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load uploaded files");
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
        const res = await fetch(`${baseUrl}/api/creative-demo-titles`);
        const data = (await res.json()) as {
          ok?: boolean;
          items?: DemoListItem[];
        };
        const items = Array.isArray(data.items) ? data.items : [];
        setDemoItems(items);
        if (items.length > 0) {
          setSelectedDemoId((prev) => prev || items[0].id);
        }
      } catch {
        setDemoItems([]);
      }
    };
    void loadDemoTitles();
  }, [canUpload, baseUrl]);

  const categories = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        demoItems
          .map((item) => item.category)
          .filter((category) => category.length > 0),
      ),
    );
    return ["all", ...unique];
  }, [demoItems]);

  const filteredDemos = React.useMemo(() => {
    if (selectedCategory === "all") return demoItems;
    return demoItems.filter((item) => item.category === selectedCategory);
  }, [demoItems, selectedCategory]);

  React.useEffect(() => {
    if (filteredDemos.length === 0) {
      setSelectedDemoId("");
      return;
    }
    if (!filteredDemos.some((d) => d.id === selectedDemoId)) {
      setSelectedDemoId(filteredDemos[0].id);
    }
  }, [filteredDemos, selectedDemoId]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(`Cannot read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleFolderSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    const zipFiles = list.filter((file) => file.name.toLowerCase().endsWith(".zip"));
    if (list.length > 0 && zipFiles.length !== list.length) {
      setError("Only .zip files are allowed for folder upload");
    } else {
      setError(null);
    }
    setSelectedFolderFiles(zipFiles);
    if (zipFiles.length === 0) {
      setSelectedFolderName("");
      return;
    }
    const first = zipFiles[0];
    const rootName = first.name.replace(/\.zip$/i, "") || "zip-upload";
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
          const relativePath = file.name;
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
        extraMessages.push("Da ghi cac field upload vao apps/server/src/data/test.json.");
      }
      if (data.creativeDemosUpdated) {
        extraMessages.push("Da cap nhat fla=true trong apps/server/src/data/creative-demos.json.");
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
          <h1 className="text-xl font-bold text-rose-300">Upload Permission Denied</h1>
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
        <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">File Upload</h1>
        <p className="text-sm text-[#a3a3a3] mt-1">
          Upload folders to server storage at <code>uploads/file-center</code>.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#020617] p-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Category filter</label>
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
          <label className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">Creative Demo Title</label>
          <select
            value={selectedDemoId}
            onChange={(e) => setSelectedDemoId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-sm text-white outline-none focus:border-[#4cceac]/60"
          >
            {filteredDemos.length === 0 ? (
              <option value="">No title available</option>
            ) : (
              filteredDemos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))
            )}
          </select>
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
          Upload zip file(s) only for this folder flow.
        </p>

        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-3">
          <input
            id="folder-upload-input"
            type="file"
            multiple
            accept=".zip,application/zip"
            ref={folderInputRef}
            onChange={handleFolderSelection}
            className="hidden"
          />
          <label
            htmlFor="folder-upload-input"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#4cceac]/30 bg-[#4cceac]/15 px-4 py-2 text-sm font-semibold text-[#9ff3de] transition-colors hover:bg-[#4cceac]/25"
          >
            Select zip file
          </label>
          <p className="mt-2 text-xs text-[#94a3b8]">
            {selectedFolderFiles.length > 0
              ? `${selectedFolderFiles.length} zip file(s) selected`
              : "No zip file selected"}
          </p>
        </div>

        <div className="text-xs text-[#a3a3a3]">
          Folder: <span className="text-white">{selectedFolderName || "-"}</span> | Files:{" "}
          <span className="text-white">{selectedFolderFiles.length}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleUploadFolder()}
          disabled={uploadingFolder || selectedFolderFiles.length === 0}
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
              <li key={file} className="rounded-xl border border-white/5 bg-[#0b1220] px-3 py-2 text-sm text-[#e5e7eb]">
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
