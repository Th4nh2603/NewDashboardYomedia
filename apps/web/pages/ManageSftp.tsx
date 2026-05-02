import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../components/Button";
import NoticePopup from "../components/NoticePopup";
import { useAuth } from "../contexts/AuthContext";
import { fetchJsonOrThrow } from "../lib/apiError";
import {
  FolderIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  fetchSftpList,
  fetchSftpSearch,
  getParentPath,
  getServerBaseUrl,
  joinPath,
  type SftpEntry,
  type SftpSearchMatch,
} from "../lib/sftpBrowser";

const DEFAULT_SFTP_PATH = "/script/demo";

type FilePanelState =
  | {
      path: string;
      content: string;
      mode: "read" | "edit";
    }
  | null;

const ManageSftp: React.FC = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const roleHeader = React.useMemo(
    () =>
      normalizedRole
        ? ({ "x-user-role": normalizedRole } as const)
        : undefined,
    [normalizedRole],
  );

  const queryClient = useQueryClient();
  const [sftpPath, setSftpPath] = React.useState(DEFAULT_SFTP_PATH);
  const [pathDraft, setPathDraft] = React.useState(DEFAULT_SFTP_PATH);
  const [filterQuery, setFilterQuery] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");

  const [filePanel, setFilePanel] = React.useState<FilePanelState>(null);
  const [panelLoadingPath, setPanelLoadingPath] = React.useState<string | null>(
    null,
  );
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [savingFile, setSavingFile] = React.useState(false);
  const [deletingPath, setDeletingPath] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    fullPath: string;
    isDir: boolean;
  } | null>(null);
  const [actionBanner, setActionBanner] = React.useState<string | null>(null);

  const isEditableFileName = React.useCallback((name: string) => {
    return /\.(html?|js|mjs|ts|css|json|txt|xml)$/i.test(name.toLowerCase());
  }, []);

  const refreshFileQueries = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["sftp-list"] });
    void queryClient.invalidateQueries({ queryKey: ["sftp-search"] });
  }, [queryClient]);

  const openReadOrEdit = React.useCallback(
    async (fullPath: string, mode: "read" | "edit") => {
      setPanelError(null);
      setPanelLoadingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          content?: string;
          error?: string;
        }>(
          `${baseUrl}/api/sftp/read?path=${encodeURIComponent(fullPath)}`,
          { headers: { ...(roleHeader ?? {}) } },
        );
        if (!data?.ok) {
          setPanelError(data?.error || "Could not read file contents.");
          return;
        }
        setFilePanel({
          path: fullPath,
          content: String(data.content ?? ""),
          mode,
        });
      } catch (err) {
        setPanelError(
          err instanceof Error ? err.message : "Error while reading file.",
        );
      } finally {
        setPanelLoadingPath(null);
      }
    },
    [roleHeader],
  );

  const handleSaveEditor = React.useCallback(async () => {
    if (!filePanel || filePanel.mode !== "edit") return;
    setSavingFile(true);
    setPanelError(null);
    try {
      const baseUrl = getServerBaseUrl();
      const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/sftp/write`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(roleHeader ?? {}),
          },
          body: JSON.stringify({
            path: filePanel.path,
            content: filePanel.content,
          }),
        },
      );
      if (!data?.ok) {
        setPanelError(data?.error || "Could not save file.");
        return;
      }
      setActionBanner("File saved.");
      refreshFileQueries();
    } catch (err) {
      setPanelError(
        err instanceof Error ? err.message : "Error while saving file.",
      );
    } finally {
      setSavingFile(false);
    }
  }, [filePanel, roleHeader, refreshFileQueries]);

  const requestDeletePath = React.useCallback(
    (fullPath: string, isDir: boolean) => {
      if (deletingPath) return;
      setDeleteConfirm({ fullPath, isDir });
    },
    [deletingPath],
  );

  const performDeletePath = React.useCallback(
    async (fullPath: string, isDir: boolean) => {
      if (deletingPath) return;
      setDeletingPath(fullPath);
      setActionBanner(null);
      try {
        const baseUrl = getServerBaseUrl();
        const data = await fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
          `${baseUrl}/api/sftp/delete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(roleHeader ?? {}),
            },
            body: JSON.stringify({ path: fullPath }),
          },
        );
        if (!data?.ok) {
          setActionBanner(data?.error || "Could not delete.");
          return;
        }
        setActionBanner("Deleted.");
        if (filePanel?.path === fullPath) setFilePanel(null);
        refreshFileQueries();
      } catch (err) {
        setActionBanner(
          err instanceof Error ? err.message : "Error while deleting.",
        );
      } finally {
        setDeletingPath(null);
      }
    },
    [deletingPath, roleHeader, filePanel?.path, refreshFileQueries],
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filterQuery.trim()), 400);
    return () => window.clearTimeout(id);
  }, [filterQuery]);

  const listQuery = useQuery<SftpEntry[]>({
    queryKey: ["sftp-list", sftpPath, normalizedRole],
    queryFn: () =>
      fetchSftpList(sftpPath, { headers: { ...(roleHeader ?? {}) } }),
  });

  const useRecursiveSearch = debouncedQ.length >= 2;
  const searchQuery = useQuery<SftpSearchMatch[]>({
    queryKey: ["sftp-search", sftpPath, debouncedQ, normalizedRole],
    queryFn: () =>
      fetchSftpSearch(sftpPath, debouncedQ, {
        headers: { ...(roleHeader ?? {}) },
      }),
    enabled: useRecursiveSearch,
  });

  const listEntries = listQuery.data ?? [];
  const searchMatches = searchQuery.data ?? [];
  const loadingList = listQuery.isFetching;
  const searchLoading = searchQuery.isFetching;
  const listError = listQuery.error;
  const searchError = searchQuery.error;

  // Filter names at current depth until recursive search kicks in (< 2 chars after debounce).
  const flatFiltered = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return listEntries;
    return listEntries.filter((e) => e.name.toLowerCase().includes(q));
  }, [listEntries, filterQuery]);

  const parentPath = getParentPath(sftpPath);

  const openDirectory = (name: string) => {
    if (loadingList) return;
    const next = joinPath(sftpPath, name);
    setSftpPath(next);
    setPathDraft(next);
  };

  const openPath = (fullPath: string) => {
    if (loadingList) return;
    setSftpPath(fullPath);
    setPathDraft(fullPath);
  };

  return (
    <div className="w-full px-8 pt-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">
          SFTP
        </h1>
        <p className="text-sm text-[#a3a3a3] max-w-2xl">
          Browse and inspect files on the demo SFTP server (list, view, edit
          text assets). Paths are absolute from the server root. Demo preview
          shortcuts apply under{" "}
          <code className="text-[#4cceac]/90">{DEFAULT_SFTP_PATH}</code>.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-[#020617] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">SFTP browser</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Search box: <span className="text-white/80">2+ characters</span>{" "}
              runs a{" "}
              <span className="text-[#4cceac]">recursive</span> search under all
              child folders of &quot;SFTP path&quot; (e.g. type{" "}
              <span className="font-mono text-[#e5e7eb]">maxkleen</span> → shows{" "}
              <span className="font-mono text-[#e5e7eb]">2026/03/maxkleen</span>
              ). Below 2 characters, only the current level is filtered.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              void listQuery.refetch();
              if (useRecursiveSearch) void searchQuery.refetch();
              refreshFileQueries();
            }}
            disabled={loadingList}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`}
            />
            Reload
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
              SFTP path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pathDraft}
                onChange={(e) => setPathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const nextPath = pathDraft.trim() || DEFAULT_SFTP_PATH;
                    setSftpPath(nextPath);
                    setPathDraft(nextPath);
                  }
                }}
                placeholder="/script/demo/..."
                spellCheck={false}
                className="flex-1 rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4cceac]/50"
              />
              <Button
                type="button"
                onClick={() => {
                  const nextPath = pathDraft.trim() || DEFAULT_SFTP_PATH;
                  setSftpPath(nextPath);
                  setPathDraft(nextPath);
                }}
                disabled={loadingList}
                className="shrink-0 rounded-xl bg-[#4cceac]/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#9ff3de] border border-[#4cceac]/30 hover:bg-[#4cceac]/30 disabled:opacity-50"
              >
                List
              </Button>
            </div>
          </div>
          {parentPath != null && (
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => {
                  setSftpPath(parentPath);
                  setPathDraft(parentPath);
                }}
                disabled={loadingList}
                className="w-full lg:w-auto rounded-xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-xs font-semibold text-[#e5e7eb] hover:bg-white/5 disabled:opacity-50"
              >
                Up to parent
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
            <FunnelIcon className="h-3.5 w-3.5 text-[#4cceac]" />
            Find folder (recursive from root)
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="e.g. maxkleen → 2026/03/maxkleen (≥2 chars)"
              className="w-full rounded-xl border border-white/10 bg-[#0b1220] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4cceac]/50"
            />
          </div>
        </div>

        <p className="text-[11px] font-mono text-[#94a3b8] break-all">
          Viewing: <span className="text-[#e5e7eb]">{sftpPath}</span>
          {useRecursiveSearch ? (
            <span className="text-[#4cceac]">
              {" "}
              · recursive search &quot;{debouncedQ}&quot;
              {searchLoading ? "…" : ` → ${searchMatches.length} folder(s)`}
            </span>
          ) : filterQuery.trim() ? (
            <span className="text-[#4cceac]">
              {" "}
              · current level: {flatFiltered.length}/{listEntries.length} item(s)
            </span>
          ) : null}
        </p>

        {listError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {listError instanceof Error ? listError.message : "SFTP list failed"}
          </div>
        )}
        {searchError && useRecursiveSearch && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {searchError instanceof Error ? searchError.message : "Folder search failed"}
          </div>
        )}
        {panelError && !filePanel && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {panelError}
          </div>
        )}
        {actionBanner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              actionBanner === "File saved." || actionBanner === "Deleted."
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-amber-500/30 bg-amber-500/10 text-amber-100"
            }`}
          >
            {actionBanner}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1220]">
                {useRecursiveSearch ? (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac]">
                      Path (from root)
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-36">
                      Open
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac]">
                      Name
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-28">
                      Type
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-32 text-right">
                      Size
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#4cceac] w-44 text-right">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {useRecursiveSearch ? (
                searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-10 text-center text-[#94a3b8]"
                    >
                      Searching folder tree…
                    </td>
                  </tr>
                ) : !searchLoading && searchMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-10 text-center text-[#94a3b8]"
                    >
                      No folders match this search.
                    </td>
                  </tr>
                ) : (
                  searchMatches.map((m) => (
                    <tr key={m.fullPath} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-mono text-[13px] text-[#e5e7eb] break-all">
                              {m.relativePath || m.matchedName}
                            </p>
                            <p className="text-[10px] text-[#64748b] mt-1 break-all font-mono">
                              {m.fullPath}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Button
                          type="button"
                          onClick={() => openPath(m.fullPath)}
                          disabled={loadingList}
                          className="text-xs font-semibold text-[#7dd3fc] hover:underline disabled:opacity-50"
                        >
                          Open folder
                        </Button>
                      </td>
                    </tr>
                  ))
                )
              ) : loadingList && listEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[#94a3b8]"
                  >
                    Loading list…
                  </td>
                </tr>
              ) : flatFiltered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-[#94a3b8]"
                  >
                    {listEntries.length === 0
                      ? "No items yet or failed to load."
                      : "No items match this filter."}
                  </td>
                </tr>
              ) : (
                flatFiltered.map((entry) => {
                  const isDir = entry.type === "d";
                  const fullPath = joinPath(sftpPath, entry.name);
                  const busyThis = panelLoadingPath === fullPath;
                  const deletingThis = deletingPath === fullPath;
                  const canEdit = !isDir && isEditableFileName(entry.name);
                  return (
                    <tr
                      key={`${entry.type}-${entry.name}`}
                      className="hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          disabled={!isDir || loadingList}
                          onClick={() => isDir && openDirectory(entry.name)}
                          className={`inline-flex items-center gap-2 text-left ${
                            isDir
                              ? "text-[#7dd3fc] hover:underline cursor-pointer"
                              : "text-[#e5e7eb] cursor-default"
                          } disabled:opacity-60`}
                        >
                          {isDir ? (
                            <FolderIcon className="h-4 w-4 shrink-0 text-amber-400/90" />
                          ) : (
                            <DocumentIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-mono text-[13px] break-all">
                            {entry.name}
                          </span>
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-[#a3a3a3]">
                        {isDir ? "Folder" : "File"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#a3a3a3] font-mono text-xs">
                        {isDir ? "—" : entry.size.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {!isDir ? (
                            <>
                              <Button
                                type="button"
                                title="Read file contents"
                                disabled={loadingList || busyThis}
                                onClick={() => void openReadOrEdit(fullPath, "read")}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-[#7dd3fc] hover:bg-white/10 disabled:opacity-50"
                              >
                                <EyeIcon className="h-3.5 w-3.5" />
                                Read
                              </Button>
                              {canEdit ? (
                                <Button
                                  type="button"
                                  title="Edit file (text)"
                                  disabled={loadingList || busyThis}
                                  onClick={() =>
                                    void openReadOrEdit(fullPath, "edit")
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#4cceac]/25 bg-[#4cceac]/10 px-2 py-1 text-[11px] font-semibold text-[#9ff3de] hover:bg-[#4cceac]/20 disabled:opacity-50"
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          <Button
                            type="button"
                            title={
                              isDir ? "Delete folder" : "Delete file"
                            }
                            disabled={
                              loadingList || busyThis || deletingThis
                            }
                            onClick={() =>
                              requestDeletePath(fullPath, isDir)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {filePanel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-sftp-file-panel-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => {
              if (!savingFile) setFilePanel(null);
            }}
          />
          <div className="relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#020617] shadow-2xl shadow-black/60">
            <div className="border-b border-white/10 px-5 py-4">
              <h2
                id="manage-sftp-file-panel-title"
                className="text-sm font-semibold text-white"
              >
                {filePanel.mode === "edit" ? "Edit file" : "Read file"}
              </h2>
              <p className="mt-1 break-all font-mono text-[11px] text-[#94a3b8]">
                {filePanel.path}
              </p>
            </div>
            {panelError ? (
              <div className="mx-5 mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {panelError}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 px-5 py-3">
              <textarea
                value={filePanel.content}
                readOnly={filePanel.mode === "read"}
                onChange={(e) =>
                  filePanel.mode === "edit" &&
                  setFilePanel({
                    ...filePanel,
                    content: e.target.value,
                  })
                }
                spellCheck={false}
                className="h-[min(60vh,520px)] w-full resize-y rounded-xl border border-white/10 bg-[#0b1220] p-3 font-mono text-xs leading-relaxed text-[#e5e7eb] outline-none focus:border-[#4cceac]/40 read-only:focus:border-white/10"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
              {filePanel.mode === "read" &&
              isEditableFileName(
                filePanel.path.split("/").pop() || filePanel.path,
              ) ? (
                <Button
                  type="button"
                  disabled={savingFile}
                  onClick={() =>
                    setFilePanel({ ...filePanel, mode: "edit" })
                  }
                  className="rounded-xl border border-[#4cceac]/30 bg-[#4cceac]/15 px-4 py-2 text-xs font-semibold text-[#9ff3de] hover:bg-[#4cceac]/25"
                >
                  Switch to edit
                </Button>
              ) : null}
              {filePanel.mode === "edit" ? (
                <Button
                  type="button"
                  disabled={savingFile}
                  onClick={() => void handleSaveEditor()}
                  className="rounded-xl bg-[#4cceac]/25 px-4 py-2 text-xs font-bold text-[#0f172a] hover:bg-[#4cceac]/40 disabled:opacity-50"
                >
                  {savingFile ? "Saving…" : "Save"}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={savingFile}
                onClick={() => {
                  setFilePanel(null);
                  setPanelError(null);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-[#e5e7eb] hover:bg-white/10 disabled:opacity-50"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <NoticePopup
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={
          deleteConfirm?.isDir
            ? "Delete folder on SFTP?"
            : "Delete file on SFTP?"
        }
        description={deleteConfirm?.fullPath}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmButtonVariant="danger"
        onConfirm={async () => {
          const d = deleteConfirm;
          if (!d) return;
          await performDeletePath(d.fullPath, d.isDir);
        }}
      />
    </div>
  );
};

export default ManageSftp;
