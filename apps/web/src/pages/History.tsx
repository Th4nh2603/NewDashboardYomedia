
import React from 'react';
import DataTable from '@/components/common/DataTable';
import Button from '@/components/common/Button';
import ConfirmPopup from '@/components/common/ConfirmPopup';
import { motion } from 'motion/react';
import { ArchiveBoxIcon, ArrowTrendingUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/stores/ThemeContext';
import { useAuth } from '@/stores/AuthContext';
import { interpolate, useLanguage } from '@/stores/LanguageContext';
import { api } from '@/api/trpc/api';
import { type ActivityLogEntry } from '@/utils/activityLog';
import { serverApiOrigin } from '@/api/serverApiOrigin';

function formatActivityDate(value: string, locale: 'en' | 'vi'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function targetHoverTitle(entry: ActivityLogEntry): string | undefined {
  const direct = String(entry.target ?? '').trim();
  if (direct) return direct;
  const m = entry.metadata;
  if (!m || typeof m !== 'object') return undefined;
  for (const key of ['fullPath', 'remoteBase', 'previousPath'] as const) {
    const v = m[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Stable accent per user so rows are easy to scan when viewing many actors. */
const USER_ACCENT_PALETTE = [
  '#4cceac',
  '#818cf8',
  '#f472b6',
  '#fbbf24',
  '#22d3ee',
  '#a78bfa',
  '#fb7185',
  '#34d399',
  '#60a5fa',
  '#f97316',
  '#2dd4bf',
  '#c084fc',
  '#84cc16',
  '#38bdf8',
  '#eab308',
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function accentColorForUser(userEmail: string | undefined, userName: string | undefined): string {
  const key = String(userEmail || userName || 'unknown').trim().toLowerCase();
  const i = hashString(key) % USER_ACCENT_PALETTE.length;
  return USER_ACCENT_PALETTE[i];
}

const History = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { locale, tHistory } = useLanguage();
  const baseUrl = serverApiOrigin();
  const roleHeader = String(user?.role || '').trim().toLowerCase();
  const isAdmin = roleHeader === 'admin';
  const isManager = roleHeader === 'manager';
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activityScope, setActivityScope] = React.useState<'all' | 'build_demo'>('all');
  const [viewScope, setViewScope] = React.useState<'mine' | 'all'>('mine');
  const [activities, setActivities] = React.useState<ActivityLogEntry[]>([]);
  const [totalAvailable, setTotalAvailable] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [clearingHistory, setClearingHistory] = React.useState(false);
  const [clearHistoryError, setClearHistoryError] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const isDark = theme === 'dark';
  const shell = isDark
    ? 'border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]'
    : 'border-slate-200/90 bg-white/80 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]';
  const muted = isDark ? 'text-[#94a3b8]' : 'text-slate-500';
  const heading = isDark ? 'text-white' : 'text-slate-900';
  const currentUserName = user?.name?.trim() || user?.email?.trim() || '';
  const currentUserEmail =
    user?.email?.trim() && user.email.trim() !== currentUserName
      ? user.email.trim()
      : '';

  React.useEffect(() => {
    if (!isAdmin && viewScope !== 'mine') {
      setViewScope('mine');
    }
  }, [isAdmin, viewScope]);

  const historyApiHeaders = React.useMemo(
    () => ({ 'x-user-role': roleHeader || 'guest' }) as const,
    [roleHeader],
  );

  React.useEffect(() => {
    const actorKey = user?.email?.trim() || user?.name?.trim();
    if (!actorKey) {
      setActivities([]);
      setTotalAvailable(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadActivities = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.activityLog.list({
          limit:
            isManager || (isAdmin && viewScope === 'all') ? 400 : 200,
          ...(isManager
            ? { special: 'manager-team' }
            : viewScope !== 'all' && user?.email?.trim()
              ? { email: user.email.trim() }
              : {}),
        });
        if (!cancelled) {
          setActivities(
            Array.isArray(data.records)
              ? (data.records as ActivityLogEntry[])
              : [],
          );
          setTotalAvailable(
            typeof data.total === 'number'
              ? data.total
              : Array.isArray(data.records)
                ? data.records.length
                : 0,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : locale === 'vi'
                ? 'Không thể tải lịch sử hoạt động.'
                : 'Unable to load activity history.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, historyApiHeaders, isAdmin, isManager, locale, user?.email, user?.name, viewScope, refreshKey]);

  const performDeleteAllHistory = React.useCallback(async () => {
    if (!isAdmin) return;
    setClearingHistory(true);
    setClearHistoryError(null);
    try {
      await api.activityLog.clear();
      setDeleteConfirmOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setClearHistoryError(
        error instanceof Error
          ? error.message
          : locale === 'vi'
            ? 'Không thể xóa lịch sử.'
            : 'Unable to delete history.',
      );
    } finally {
      setClearingHistory(false);
    }
  }, [baseUrl, historyApiHeaders, isAdmin, locale]);

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

  const scopeFilteredActivities = React.useMemo(() => {
    if (activityScope !== 'build_demo') return activities;
    return activities.filter((a) => String(a.area || '').trim() === 'Build Demo');
  }, [activities, activityScope]);

  const filteredActivities = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scopeFilteredActivities;
    return scopeFilteredActivities.filter((activity) =>
      [
        activity.userName,
        activity.userEmail,
        activity.description,
        activity.target,
        activity.area,
        activity.action,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    );
  }, [scopeFilteredActivities, searchQuery]);

  const activityListTotal = React.useMemo(() => {
    if (searchQuery.trim() || activityScope === 'build_demo') {
      return filteredActivities.length;
    }
    return totalAvailable;
  }, [activityScope, filteredActivities.length, searchQuery, totalAvailable]);

  const visibleActivities = React.useMemo(
    () => filteredActivities.slice(0, 100),
    [filteredActivities],
  );

  const mappedData = React.useMemo(
    () =>
      visibleActivities.map((activity) => {
        const userAccent = accentColorForUser(activity.userEmail, activity.userName);
        const nameColor = isDark ? 'text-[#e8e8e8]' : 'text-slate-900';
        const subColor = isDark ? 'text-slate-400' : 'text-slate-600';
        return {
        user: (
          <div className="flex min-w-[180px] items-start gap-2.5">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/15 dark:ring-white/15"
              style={{ backgroundColor: userAccent }}
              aria-hidden
            />
            <div
              className="min-w-0 flex-1 border-l-2 pl-2.5"
              style={{ borderLeftColor: userAccent }}
            >
              <p className={`font-semibold ${nameColor}`}>
                {activity.userName || activity.userEmail || 'User'}
              </p>
              <p className={`text-xs ${subColor}`}>{activity.userEmail || '—'}</p>
            </div>
          </div>
        ),
        activity: (
          <div className="min-w-[240px]">
            <p className="font-medium text-[#e8e8e8]">{activity.description}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              {activity.action}
            </p>
          </div>
        ),
        target: (
          <span
            className="inline-block max-w-[220px] cursor-help truncate text-slate-300"
            title={targetHoverTitle(activity)}
          >
            {activity.target?.trim() ? activity.target.trim() : '—'}
          </span>
        ),
        date: (
          <span className="whitespace-nowrap">
            {formatActivityDate(activity.createdAt, locale)}
          </span>
        ),
        area: (
          <span className="inline-flex rounded-full border border-[#4cceac]/25 bg-[#4cceac]/10 px-2.5 py-1 text-xs font-semibold text-[#7ce1c8]">
            {activity.area || '—'}
          </span>
        ),
      };
      }),
    [isDark, locale, visibleActivities],
  );

  const highlights = React.useMemo(() => {
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const todayCount = activities.filter((activity) => {
      const time = new Date(activity.createdAt).getTime();
      return Number.isFinite(time) && time >= dayStart.getTime();
    }).length;
    const weekCount = activities.filter((activity) => {
      const time = new Date(activity.createdAt).getTime();
      return Number.isFinite(time) && time >= weekAgo;
    }).length;

    const buildDemoCount = activities.filter(
      (a) => String(a.area || '').trim() === 'Build Demo',
    ).length;

    return [
      {
        label: tHistory('highlightVault'),
        value: String(activities.length),
        tone: 'from-[#4cceac]/30',
      },
      {
        label: tHistory('highlightWeek'),
        value: String(weekCount),
        tone: 'from-indigo-400/28',
      },
      {
        label: tHistory('highlightProcessing'),
        value: String(todayCount),
        tone: 'from-amber-400/25',
      },
      {
        label: tHistory('highlightBuildDemo'),
        value: String(buildDemoCount),
        tone: 'from-teal-500/28',
      },
    ];
  }, [activities, tHistory]);

  const emptyTitle =
    locale === 'vi' ? 'Chưa có hoạt động nào được ghi nhận.' : 'No activity recorded yet.';
  const emptyDescription = (() => {
    if (activityScope === 'build_demo' && activities.length > 0 && scopeFilteredActivities.length === 0) {
      return locale === 'vi'
        ? 'Không có mục Build Demo trong danh sách đã tải. Thử "Mọi hoạt động" hoặc tải lại sau khi có upload/ZIP.'
        : 'No Build Demo entries in the loaded list. Try "All activity" or reload after uploads or ZIP actions.';
    }
    if (locale === 'vi') {
      return isManager
        ? 'Chưa có hoạt động nào từ team Media / Design.'
        : viewScope === 'all'
          ? 'Chưa có hoạt động nào của người dùng trong hệ thống.'
          : 'Khi user mở trang hoặc thực hiện thao tác quan trọng, lịch sử sẽ hiển thị tại đây.';
    }
    return isManager
      ? 'No activity from the Media / Design team yet.'
      : viewScope === 'all'
        ? 'No user activity is available across the system yet.'
        : 'Recent page visits and important user actions will appear here.';
  })();

  return (
    <>
      <div className="max-w-full mx-auto space-y-8 w-full">
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
            {currentUserName ? (
              <div
                className={`inline-flex max-w-full flex-col rounded-2xl border px-4 py-3 ${
                  isDark
                    ? 'border-white/10 bg-white/5'
                    : 'border-slate-200 bg-slate-50/90'
                }`}
              >
                <span className={`truncate text-sm font-semibold ${heading}`}>
                  {currentUserName}
                </span>
                {currentUserEmail ? (
                  <span className={`truncate text-xs ${muted}`}>{currentUserEmail}</span>
                ) : null}
                {isAdmin && viewScope === 'all' ? (
                  <span className="mt-2 inline-flex w-fit rounded-full border border-[#4cceac]/25 bg-[#4cceac]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7ce1c8]">
                    {locale === 'vi' ? 'Đang xem tất cả user' : 'Viewing all users'}
                  </span>
                ) : null}
                {isManager ? (
                  <span className="mt-2 inline-flex w-fit rounded-full border border-[#4cceac]/25 bg-[#4cceac]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7ce1c8]">
                    {locale === 'vi'
                      ? 'Media & Design (không gồm admin)'
                      : 'Media & Design (excludes admin)'}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 w-full md:w-auto">
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
            <div
              className={`inline-flex rounded-xl border p-1 ${
                isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <Button
                type="button"
                onClick={() => setActivityScope('all')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  activityScope === 'all'
                    ? 'bg-gradient-to-r from-[#4cceac] to-teal-600 text-white'
                    : isDark
                      ? 'text-[#e0e0e0] hover:bg-white/10'
                      : 'text-slate-700 hover:bg-white'
                }`}
              >
                {tHistory('buildDemoFilterAll')}
              </Button>
              <Button
                type="button"
                onClick={() => setActivityScope('build_demo')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  activityScope === 'build_demo'
                    ? 'bg-gradient-to-r from-[#4cceac] to-teal-600 text-white'
                    : isDark
                      ? 'text-[#e0e0e0] hover:bg-white/10'
                      : 'text-slate-700 hover:bg-white'
                }`}
              >
                {tHistory('buildDemoFilterOnly')}
              </Button>
            </div>
            {isAdmin ? (
              <div className={`inline-flex rounded-xl border p-1 ${
                isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
              }`}>
                <Button
                  type="button"
                  onClick={() => setViewScope('mine')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    viewScope === 'mine'
                      ? 'bg-gradient-to-r from-[#4cceac] to-teal-600 text-white'
                      : isDark
                        ? 'text-[#e0e0e0] hover:bg-white/10'
                        : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {locale === 'vi' ? 'Của tôi' : 'My activity'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewScope('all')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                    viewScope === 'all'
                      ? 'bg-gradient-to-r from-[#4cceac] to-teal-600 text-white'
                      : isDark
                        ? 'text-[#e0e0e0] hover:bg-white/10'
                        : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {locale === 'vi' ? 'Tất cả user' : 'All users'}
                </Button>
              </div>
            ) : null}
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={tHistory('searchPlaceholder')}
              className={`min-w-[200px] flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4cceac]/40 ${
                isDark
                  ? 'bg-[#0f172a]/50 border-white/10 text-[#e8e8e8] placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <Button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                isDark
                  ? 'bg-white/10 text-[#e0e0e0] hover:bg-white/15'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tHistory('filter')}
            </Button>
            {isAdmin ? (
              <Button
                type="button"
                onClick={() => {
                  setClearHistoryError(null);
                  setDeleteConfirmOpen(true);
                }}
                disabled={clearingHistory || loading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                  isDark
                    ? 'border border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <TrashIcon className="h-4 w-4 shrink-0" aria-hidden />
                {clearingHistory ? tHistory('deleteHistoryClearing') : tHistory('deleteHistoryButton')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className={`rounded-2xl border px-4 py-5 text-sm ${muted} ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              {locale === 'vi' ? 'Đang tải lịch sử hoạt động...' : 'Loading activity history...'}
            </div>
          ) : loadError ? (
            <div className={`rounded-2xl border px-4 py-5 text-sm ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {loadError}
            </div>
          ) : mappedData.length > 0 ? (
            <DataTable headers={headers} data={mappedData} />
          ) : (
            <div className={`rounded-2xl border px-5 py-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/90'}`}>
              <p className={`text-sm font-semibold ${heading}`}>{emptyTitle}</p>
              <p className={`mt-1 text-sm ${muted}`}>{emptyDescription}</p>
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 text-sm border-t ${muted} ${isDark ? 'border-white/[0.06]' : 'border-slate-200/90'}`}>
          <span>
            {interpolate(tHistory('pagination'), {
              shown: mappedData.length,
              total: activityListTotal,
            })}
          </span>
          <div className="text-xs">
            {searchQuery.trim()
              ? locale === 'vi'
                ? `Đang lọc theo: ${searchQuery.trim()}`
                : `Filtering by: ${searchQuery.trim()}`
              : null}
          </div>
        </div>
      </motion.div>
      </div>

      <ConfirmPopup
        open={deleteConfirmOpen}
        onClose={() => {
          if (clearingHistory) return;
          setDeleteConfirmOpen(false);
          setClearHistoryError(null);
        }}
        title={tHistory('deleteHistoryDialogTitle')}
        message={tHistory('deleteHistoryConfirm')}
        cancelLabel={tHistory('deleteHistoryDialogCancel')}
        confirmLabel={tHistory('deleteHistoryDialogAction')}
        confirmLoading={clearingHistory}
        confirmLoadingLabel={tHistory('deleteHistoryClearing')}
        error={clearHistoryError}
        isDark={isDark}
        onConfirm={performDeleteAllHistory}
      />
    </>
  );
};

export default History;
