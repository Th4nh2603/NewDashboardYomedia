
import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

interface DataTableProps {
  headers: string[];
  data: any[];
}

const DataTable: React.FC<DataTableProps> = ({ headers, data }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#3d465d]">
            {headers.map((header) => (
              <th key={header} className="px-4 py-4 text-[#4cceac] font-bold uppercase tracking-wider text-xs">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3d465d]">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[#1f2a40] transition-colors">
              {Object.entries(row).map(([key, val]: [string, any], j) => (
                <td key={j} className="px-4 py-4 text-[#e0e0e0]">
                  {key === 'VIEW' ? (
                    <EyeIcon className="w-5 h-5 text-[#e0e0e0] cursor-pointer" />
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
