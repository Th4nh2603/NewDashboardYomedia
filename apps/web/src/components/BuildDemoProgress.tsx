import React from "react";

type BuildDemoProgressProps = {
  label: string;
  percent: number;
};

const BuildDemoProgress = ({ label, percent }: BuildDemoProgressProps) => {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="w-full max-w-md rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-800 p-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
          Đang tạo Build Demo
        </p>
        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {clamped}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
};

export default BuildDemoProgress;
