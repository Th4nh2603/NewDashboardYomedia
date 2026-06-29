
import React from "react";
import { EyeIcon } from "@heroicons/react/24/outline";

type DataTableRow = Record<string, React.ReactNode>;

interface DataTableProps {
  headers: string[];
  data: DataTableRow[];
  onViewRow?: (row: DataTableRow, index: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({ headers, data, onViewRow }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#3d465d]">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-4 text-[#4cceac] font-bold uppercase tracking-wider text-xs"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3d465d]">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[#1f2a40] transition-colors">
              {Object.entries(row).map(([key, val], j) => (
                <td key={j} className="px-4 py-4 text-[#e0e0e0]">
                  {key === "VIEW" && onViewRow ? (
                    <button
                      type="button"
                      aria-label={`View row ${i + 1}`}
                      onClick={() => onViewRow(row, i)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#e0e0e0] transition-colors hover:bg-white/10 hover:text-[#4cceac] focus:outline-none focus:ring-2 focus:ring-[#4cceac]/50"
                    >
                      <EyeIcon className="w-5 h-5" aria-hidden />
                    </button>
                  ) : key === "VIEW" ? (
                    <EyeIcon className="w-5 h-5 text-[#a3a3a3]" aria-hidden />
                  ) : (
                    val
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
