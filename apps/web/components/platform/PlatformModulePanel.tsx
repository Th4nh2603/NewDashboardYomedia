import React from "react";
import { api } from "../../lib/trpc/api";
import Button from "../Button";
import type { PlatformModuleData } from "./types";

function cellText(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldDisplayValue(
  field: PlatformModuleData["createForm"]["fields"][number],
): string {
  if (field.type === "checkbox") return field.checked ? "ON" : "OFF";
  if (field.type === "size") {
    return `${field.width ?? "—"} × ${field.height ?? "—"} px`;
  }
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === field.value);
    const label = opt?.label ?? field.value ?? "—";
    const count = field.options?.length ?? 0;
    if (count > 0) {
      return `${label} (${count.toLocaleString()} option${count === 1 ? "" : "s"})`;
    }
    return label;
  }
  if (field.type === "file") return "(file upload)";
  return field.value?.trim() ? field.value : "—";
}

function gridColumnsForDisplay(
  columns: PlatformModuleData["grid"]["columns"],
  showAllColumns: boolean,
) {
  if (showAllColumns) {
    return columns.filter((c) => c.name !== "action");
  }
  return columns.filter(
    (c) => !["id", "permission", "notes", "action"].includes(c.name),
  );
}

const GRID_PAGE_SIZE = 100;

type PlacementCodeResult = {
  placementId: string;
  variant: "standard" | "rtb";
  sourceUrl: string;
  code: string;
  meta: {
    placementName: string | null;
    account: string | null;
    site: string | null;
    size: string | null;
    type: string | null;
  };
};

type PlatformModulePanelProps = {
  heading: string;
  sourceUrl: string;
  sourceLabel: string;
  createForm: PlatformModuleData["createForm"];
  grid: PlatformModuleData["grid"];
  nameColumn: string;
  showAllColumns?: boolean;
  enableGetCode?: boolean;
  hideGrid?: boolean;
  gridEmptyMessage?: string;
};

const PlatformModulePanel: React.FC<PlatformModulePanelProps> = ({
  heading,
  sourceUrl,
  sourceLabel,
  createForm,
  grid,
  nameColumn,
  showAllColumns = false,
  enableGetCode = false,
  hideGrid = false,
  gridEmptyMessage,
}) => {
  const [gridPage, setGridPage] = React.useState(1);
  const [codeLoading, setCodeLoading] = React.useState(false);
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [codeResult, setCodeResult] =
    React.useState<PlacementCodeResult | null>(null);
  const columns = gridColumnsForDisplay(grid.columns, showAllColumns);
  const totalPages = Math.max(1, Math.ceil(grid.rows.length / GRID_PAGE_SIZE));
  const pageSafe = Math.min(gridPage, totalPages);
  const rowSlice = grid.rows.slice(
    (pageSafe - 1) * GRID_PAGE_SIZE,
    pageSafe * GRID_PAGE_SIZE,
  );
  const allRowsLoaded = grid.rows.length >= grid.records;

  React.useEffect(() => {
    setGridPage(1);
  }, [grid.rows.length, grid.records]);

  const fetchPlacementCode = async (
    placementId: string,
    variant: "standard" | "rtb",
  ) => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const data = await api.testData.placementCode(placementId, variant);
      if (!data?.ok || !data.code) {
        throw new Error("Không lấy được embed code");
      }
      setCodeResult({
        placementId: data.placementId,
        variant: data.variant,
        sourceUrl: data.sourceUrl,
        code: data.code,
        meta: data.meta,
      });
    } catch (err) {
      setCodeResult(null);
      setCodeError(err instanceof Error ? err.message : "Get Code failed");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="space-y-5 pt-2 border-t border-white/5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4cceac]">
          {heading}
        </h3>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-mono text-[#64748b] hover:text-[#4cceac]"
        >
          {sourceLabel}
        </a>
      </div>
      {!hideGrid ? (
        <p className="text-[11px] text-[#94a3b8] font-mono">
          {allRowsLoaded ? (
            <>
              Đã tải {grid.rows.length.toLocaleString()} /{" "}
              {grid.records.toLocaleString()} bản ghi
            </>
          ) : (
            <>
              Chỉ có {grid.rows.length.toLocaleString()} /{" "}
              {grid.records.toLocaleString()} bản ghi — bấm Tải lại
            </>
          )}
          {showAllColumns ? " · tất cả cột" : ""}
        </p>
      ) : null}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-3">
          {createForm.title}
        </h4>
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {createForm.fields.map((field) => (
                <tr
                  key={field.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <th className="py-2.5 px-3 text-left text-xs font-semibold text-[#94a3b8] align-top w-[40%] sm:w-[28%]">
                    {field.label}
                  </th>
                  <td className="py-2.5 px-3 text-xs text-white/90 align-top break-words">
                    <span className="text-[10px] text-[#64748b] mr-2 font-mono">
                      {field.name}
                    </span>
                    {fieldDisplayValue(field)}
                    {showAllColumns &&
                    field.type === "select" &&
                    (field.options?.length ?? 0) > 0 ? (
                      <details className="mt-2 text-[10px] text-[#94a3b8]">
                        <summary className="cursor-pointer text-[#4cceac]">
                          Xem {field.options?.length} option
                        </summary>
                        <ul className="mt-1 max-h-40 overflow-y-auto font-mono space-y-0.5 pl-2 border-l border-white/10">
                          {(field.options ?? []).map((opt) => (
                            <li key={`${field.id}-${opt.value}-${opt.label}`}>
                              {opt.value ? `${opt.value} · ` : ""}
                              {opt.label}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {!hideGrid ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">
              Danh sách ({createForm.fields.length} field form · {columns.length}{" "}
              cột)
            </h4>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#94a3b8]">
                <Button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
                >
                  Trước
                </Button>
                <span>
                  {pageSafe}/{totalPages} (mỗi trang {GRID_PAGE_SIZE})
                </span>
                <Button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 disabled:opacity-40"
                >
                  Sau
                </Button>
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5 max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm border-collapse min-w-[56rem]">
              <thead className="sticky top-0 bg-[#141b2d] z-10">
                <tr className="border-b border-white/10 text-left text-[#94a3b8]">
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      className="py-2 px-3 font-semibold whitespace-nowrap text-xs"
                    >
                      {col.label}
                    </th>
                  ))}
                  {enableGetCode ? (
                    <th className="py-2 px-3 font-semibold whitespace-nowrap text-xs">
                      Get Code
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rowSlice.map((row, rowIdx) => (
                  <tr
                    key={String(row.id ?? `${pageSafe}-${rowIdx}`)}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.name}
                        className={`py-2 px-3 align-top text-xs max-w-md break-words ${
                          col.name === nameColumn
                            ? "font-medium text-white"
                            : "font-mono text-white/80"
                        }`}
                      >
                        {cellText(row[col.name])}
                      </td>
                    ))}
                    {enableGetCode ? (
                      <td className="py-2 px-3 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={codeLoading || !row.id}
                            onClick={() =>
                              void fetchPlacementCode(String(row.id), "standard")
                            }
                            className="text-[10px] font-bold uppercase tracking-wide text-[#4cceac] hover:underline disabled:opacity-40"
                          >
                            SDK
                          </button>
                          <button
                            type="button"
                            disabled={codeLoading || !row.id}
                            onClick={() =>
                              void fetchPlacementCode(String(row.id), "rtb")
                            }
                            className="text-[10px] font-bold uppercase tracking-wide text-indigo-300 hover:underline disabled:opacity-40"
                          >
                            RTB
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {enableGetCode && (codeLoading || codeError || codeResult) ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#0d111a] p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#4cceac]">
                Embed code
                {codeResult
                  ? ` · ${codeResult.variant === "rtb" ? "Get Code RTB" : "Get Code"}`
                  : ""}
              </p>
              {codeLoading ? (
                <p className="text-xs text-[#94a3b8]">
                  Đang lấy code từ platform…
                </p>
              ) : null}
              {codeError ? (
                <p className="text-xs text-rose-300">{codeError}</p>
              ) : null}
              {codeResult ? (
                <>
                  <p className="text-[11px] text-[#94a3b8] font-mono break-all">
                    {codeResult.sourceUrl}
                  </p>
                  {codeResult.meta.placementName ? (
                    <p className="text-xs text-white/80">
                      {codeResult.meta.placementName}
                      {codeResult.meta.account
                        ? ` · ${codeResult.meta.account}`
                        : ""}
                      {codeResult.meta.site ? ` · ${codeResult.meta.site}` : ""}
                      {codeResult.meta.size ? ` · ${codeResult.meta.size}` : ""}
                      {codeResult.meta.type ? ` · ${codeResult.meta.type}` : ""}
                    </p>
                  ) : null}
                  <pre className="max-h-64 overflow-auto text-[11px] font-mono text-white/85 leading-relaxed whitespace-pre-wrap">
                    {codeResult.code}
                  </pre>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : gridEmptyMessage ? (
        <p className="text-xs text-[#94a3b8] rounded-xl border border-white/10 bg-[#0d111a]/60 px-4 py-3">
          {gridEmptyMessage}
        </p>
      ) : null}
    </div>
  );
};

export default PlatformModulePanel;
