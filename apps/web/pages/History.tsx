
import React from 'react';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import { motion } from 'motion/react';
import { ArchiveBoxIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { interpolate, useLanguage } from '../contexts/LanguageContext';

const History = () => {
  const { theme } = useTheme();
  const { tHistory } = useLanguage();
  const isDark = theme === 'dark';
  const shell = isDark
    ? 'border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]'
    : 'border-slate-200/90 bg-white/80 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]';
  const muted = isDark ? 'text-[#94a3b8]' : 'text-slate-500';
  const heading = isDark ? 'text-white' : 'text-slate-900';

  const headers = React.useMemo(
    () =>
      [
        tHistory('tableType'),
        tHistory('tableCampaign'),
        tHistory('tableModel'),
        tHistory('tableDate'),
        tHistory('tableStatus'),
      ],
    [tHistory],
  );

  const historyData = React.useMemo(
    () => [
      {
        id: '1',
        type: tHistory('typeStrategy'),
        prompt: 'Q3 Social Media Strategy for Eco-friendly SaaS',
        model: 'Gemini 3 Pro',
        date: '2024-05-20',
        status: (
          <span className="text-emerald-500 font-medium">
            {tHistory('statusFinalized')}
          </span>
        ),
      },
      {
        id: '2',
        type: tHistory('typeGraphics'),
        prompt: 'Instagram Story background: abstract gradients, purple/orange',
        model: 'Gemini 2.5 Flash',
        date: '2024-05-19',
        status: (
          <span className="text-emerald-500 font-medium">
            {tHistory('statusRendered')}
          </span>
        ),
      },
      {
        id: '3',
        type: tHistory('typeVideoAd'),
        prompt: 'Cinematic 15s teaser for Summer Flash Sale',
        model: 'Veo-3.1',
        date: '2024-05-18',
        status: (
          <span className="text-amber-500 font-medium">
            {tHistory('statusProcessing')}
          </span>
        ),
      },
      {
        id: '4',
        type: tHistory('typeCopywriting'),
        prompt: '5 Google Search Ad headlines for "YomediaAI Marketing Tools"',
        model: 'Gemini 3 Pro',
        date: '2024-05-18',
        status: (
          <span className="text-emerald-500 font-medium">
            {tHistory('statusFinalized')}
          </span>
        ),
      },
      {
        id: '5',
        type: tHistory('typeGraphics'),
        prompt: 'Ebook cover: "The Future of AI in Digital Marketing"',
        model: 'Gemini 2.5 Flash',
        date: '2024-05-17',
        status: (
          <span className="text-red-500 font-medium">
            {tHistory('statusFailed')}
          </span>
        ),
      },
    ],
    [tHistory],
  );

  const mappedData = React.useMemo(
    () =>
      historyData.map(({ type, prompt, model, date, status }) => ({
        type,
        prompt: (
          <span className="truncate max-w-[200px] inline-block font-medium">
            {prompt}
          </span>
        ),
        model,
        date,
        status,
      })),
    [historyData],
  );

  const highlights = React.useMemo(
    () => [
      {
        label: tHistory('highlightVault'),
        value: '128',
        tone: 'from-[#4cceac]/30',
      },
      {
        label: tHistory('highlightWeek'),
        value: '36',
        tone: 'from-indigo-400/28',
      },
      {
        label: tHistory('highlightProcessing'),
        value: '3',
        tone: 'from-amber-400/25',
      },
    ],
    [tHistory],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-[2rem] border p-8 ${shell}`}
      >
        <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full blur-3xl bg-gradient-to-br from-[#4cceac]/20 to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-xl">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${isDark ? 'border-white/15 bg-white/5 text-[#cbd5e1]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              <ArchiveBoxIcon className="h-4 w-4 text-[#4cceac]" />
              {tHistory('badge')}
            </span>
            <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${heading}`}>
              {tHistory('title')}
            </h2>
            <p className={`leading-relaxed ${muted}`}>
              {tHistory('description')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0 w-full md:w-auto">
            {highlights.map((h) => (
              <div
                key={h.label}
                className={`relative rounded-2xl border px-4 py-3 overflow-hidden ${isDark ? 'border-white/[0.06] bg-[#151d2f]/80' : 'border-slate-200/80 bg-slate-50/90'}`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${h.tone} to-transparent opacity-80`} aria-hidden />
                <p className={`relative text-xl font-black ${heading}`}>{h.value}</p>
                <p className={`relative text-[10px] font-bold uppercase tracking-wide mt-1 ${muted}`}>{h.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className={`rounded-[1.75rem] border overflow-hidden ${shell}`}
      >
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200/90'}`}>
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-[#4cceac]" />
            <h3 className={`text-lg font-black ${heading}`}>
              {tHistory('recentTitle')}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder={tHistory('searchPlaceholder')}
              className={`min-w-[200px] flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4cceac]/40 ${
                isDark
                  ? 'bg-[#0f172a]/50 border-white/10 text-[#e8e8e8] placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <Button className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              isDark
                ? 'bg-white/10 text-[#e0e0e0] hover:bg-white/15'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}>
              {tHistory('filter')}
            </Button>
          </div>
        </div>

        <div className="p-6">
          <DataTable headers={headers} data={mappedData} />
        </div>

        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 text-sm border-t ${muted} ${isDark ? 'border-white/[0.06]' : 'border-slate-200/90'}`}>
          <span>
            {interpolate(tHistory('pagination'), { shown: 5, total: 128 })}
          </span>
          <div className="flex flex-wrap gap-1">
            <Button className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isDark
                ? 'border border-white/10 hover:bg-white/10 text-[#e0e0e0]'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}>
              {tHistory('prev')}
            </Button>
            <Button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#4cceac] to-teal-600 text-white text-xs font-bold shadow-md shadow-[#4cceac]/15">1</Button>
            <Button className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isDark
                ? 'border border-white/10 hover:bg-white/10 text-[#e0e0e0]'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}>2</Button>
            <Button className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isDark
                ? 'border border-white/10 hover:bg-white/10 text-[#e0e0e0]'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}>
              {tHistory('next')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default History;
