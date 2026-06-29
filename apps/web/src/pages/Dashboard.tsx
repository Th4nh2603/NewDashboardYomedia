import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArchiveBoxIcon,
  ArrowUpTrayIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  QueueListIcon,
  RectangleStackIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  TableCellsIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/stores/ThemeContext";

type SnapshotState = "ready" | "attention" | "blocked" | "neutral";

type DashboardSummary = {
  label: string;
  value: string;
  detail: string;
  state: SnapshotState;
  path: string;
};

type OperationalMetric = {
  label: string;
  value: string;
  detail: string;
  state: SnapshotState;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
};

type QuickAction = {
  label: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

type QuickActionGroup = {
  title: string;
  description: string;
  items: QuickAction[];
};

const MOCK_OPERATIONAL_SNAPSHOT = {
  updatedLabel: "Mock operations snapshot",
  updatedAt: "Replace with API data",
  summaries: [
    {
      label: "Demo readiness",
      value: "7 ready",
      detail: "2 need assets before client review",
      state: "attention",
      path: "/manage-demo",
    },
    {
      label: "Work queue",
      value: "11 open",
      detail: "Uploads, indexing, and failed jobs",
      state: "attention",
      path: "/history",
    },
    {
      label: "Team command",
      value: "4 active areas",
      detail: "Brands, campaigns, users, and systems",
      state: "ready",
      path: "/admin/users",
    },
  ] satisfies DashboardSummary[],
  metrics: [
    {
      label: "Pending uploads",
      value: "5",
      detail: "Folders waiting for SFTP handoff",
      state: "attention",
      icon: ArrowUpTrayIcon,
      path: "/upload",
    },
    {
      label: "Indexing jobs",
      value: "3",
      detail: "Documents queued for search/RAG refresh",
      state: "neutral",
      icon: DocumentMagnifyingGlassIcon,
      path: "/documentation",
    },
    {
      label: "Failed jobs",
      value: "1",
      detail: "Needs operator review before retry",
      state: "blocked",
      icon: ExclamationTriangleIcon,
      path: "/history",
    },
    {
      label: "Active brands/campaigns",
      value: "12",
      detail: "Live workspaces with demo activity",
      state: "ready",
      icon: BuildingOffice2Icon,
      path: "/creative",
    },
    {
      label: "Client-ready links",
      value: "18",
      detail: "Demo links ready for sharing",
      state: "ready",
      icon: LinkIcon,
      path: "/manage-demo",
    },
  ] satisfies OperationalMetric[],
};

const QUICK_ACTION_GROUPS: QuickActionGroup[] = [
  {
    title: "Demo readiness",
    description: "Prepare and verify client-facing creative demos.",
    items: [
      {
        label: "Build demo",
        description: "Create or update a structured creative demo.",
        path: "/build-demo",
        icon: WrenchScrewdriverIcon,
      },
      {
        label: "Manage demos",
        description: "Review demo status, files, and shareable links.",
        path: "/manage-demo",
        icon: RectangleStackIcon,
      },
    ],
  },
  {
    title: "Work queue",
    description: "Move files, documents, and activity through daily operations.",
    items: [
      {
        label: "Upload files",
        description: "Stage folders and upload FLA/PSD assets.",
        path: "/upload",
        icon: ArrowUpTrayIcon,
      },
      {
        label: "Activity history",
        description: "Audit recent work and failed operations.",
        path: "/history",
        icon: ArchiveBoxIcon,
      },
      {
        label: "Documentation",
        description: "Find guides, indexed documents, and checklists.",
        path: "/documentation",
        icon: ClipboardDocumentListIcon,
      },
    ],
  },
  {
    title: "Brand/Campaign management",
    description: "Keep creative libraries and campaign data organized.",
    items: [
      {
        label: "Creative library",
        description: "Browse formats, assets, and reference specs.",
        path: "/creative",
        icon: TableCellsIcon,
      },
      {
        label: "Creative demos table",
        description: "Maintain demo metadata and campaign rows.",
        path: "/creative-demos-edit",
        icon: QueueListIcon,
      },
    ],
  },
  {
    title: "System operations",
    description: "Administer users, transport, and platform tooling.",
    items: [
      {
        label: "Users & permissions",
        description: "Review roles and route access for internal users.",
        path: "/admin/users",
        icon: ShieldCheckIcon,
      },
      {
        label: "SFTP operations",
        description: "Check hosts and file transport setup.",
        path: "/manage-sftp",
        icon: ServerStackIcon,
      },
      {
        label: "Tool test",
        description: "Validate platform banner workflows.",
        path: "/tool/test",
        icon: UsersIcon,
      },
    ],
  },
];

const statusClass: Record<SnapshotState, string> = {
  ready: "border-[#4cceac]/35 bg-[#4cceac]/10 text-[#4cceac]",
  attention: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  blocked: "border-rose-400/35 bg-rose-400/10 text-rose-300",
  neutral: "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

const dotClass: Record<SnapshotState, string> = {
  ready: "bg-[#4cceac]",
  attention: "bg-amber-400",
  blocked: "bg-rose-400",
  neutral: "bg-slate-400",
};

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  const shell = isDark
    ? "border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
    : "border-slate-200/90 bg-white/85 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]";
  const panel = isDark
    ? "border-white/[0.06] bg-[#151d2f]/90"
    : "border-slate-200/80 bg-slate-50/90";
  const heading = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-[#94a3b8]" : "text-slate-600";
  const subtle = isDark ? "text-slate-400" : "text-slate-500";
  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4cceac]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141b2d]";

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-8 pb-10">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.35 }}
        className={`rounded-3xl border p-6 md:p-8 ${shell}`}
        aria-labelledby="dashboard-title"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statusClass.attention}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass.attention}`} />
              {MOCK_OPERATIONAL_SNAPSHOT.updatedLabel}
            </div>
            <div className="space-y-3">
              <h1
                id="dashboard-title"
                className={`max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-4xl ${heading}`}
              >
                YoMedia operations command
              </h1>
              <p className={`max-w-2xl text-base leading-relaxed ${muted}`}>
                Track demo readiness, queue pressure, and team operations from
                one internal workspace. The data below is intentionally marked
                as mock so it can be replaced by API-backed status later.
              </p>
            </div>
          </div>
          <div className={`text-sm ${subtle}`}>
            Updated:{" "}
            <span className={`font-semibold ${heading}`}>
              {MOCK_OPERATIONAL_SNAPSHOT.updatedAt}
            </span>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {MOCK_OPERATIONAL_SNAPSHOT.summaries.map((item, index) => (
            <Link
              key={item.label}
              to={item.path}
              className={`rounded-2xl border p-5 transition-colors hover:border-[#4cceac]/40 ${panel} ${focusRing}`}
            >
              <motion.article
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: index * 0.04 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className={`text-sm font-bold ${heading}`}>
                      {item.label}
                    </h2>
                    <p className={`mt-1 text-xs leading-relaxed ${muted}`}>
                      {item.detail}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusClass[item.state]}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${dotClass[item.state]}`} />
                    {item.state}
                  </span>
                </div>
                <p className={`mt-5 text-2xl font-black tabular-nums ${heading}`}>
                  {item.value}
                </p>
              </motion.article>
            </Link>
          ))}
        </div>
      </motion.section>

      <section aria-labelledby="operations-metrics">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="operations-metrics" className={`text-xl font-black ${heading}`}>
              Operational status
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>
              Placeholder metrics for the status API: uploads, indexing,
              failures, active work, and client-ready links.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {MOCK_OPERATIONAL_SNAPSHOT.metrics.map((metric, index) => (
            <Link
              key={metric.label}
              to={metric.path}
              className={`rounded-2xl border p-5 transition-colors hover:border-[#4cceac]/40 ${panel} ${focusRing}`}
            >
              <motion.article
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: index * 0.035 }}
                className="h-full"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`rounded-xl border p-2 ${statusClass[metric.state]}`}
                  >
                    <metric.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className={`h-2 w-2 rounded-full ${dotClass[metric.state]}`} />
                </div>
                <p className={`mt-5 text-2xl font-black tabular-nums ${heading}`}>
                  {metric.value}
                </p>
                <h3 className={`mt-1 text-xs font-bold uppercase tracking-[0.08em] ${muted}`}>
                  {metric.label}
                </h3>
                <p className={`mt-2 text-xs leading-relaxed ${subtle}`}>
                  {metric.detail}
                </p>
              </motion.article>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="workflow-shortcuts">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="workflow-shortcuts" className={`text-xl font-black ${heading}`}>
              Workflow shortcuts
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>
              Grouped by the work YoMedia operators move through each day.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {QUICK_ACTION_GROUPS.map((group, groupIndex) => (
            <motion.article
              key={group.title}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: groupIndex * 0.04 }}
              className={`rounded-2xl border p-5 ${shell}`}
            >
              <div className="mb-4">
                <h3 className={`text-lg font-bold ${heading}`}>{group.title}</h3>
                <p className={`mt-1 text-sm leading-relaxed ${muted}`}>
                  {group.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    aria-label={`${action.label}: ${action.description}`}
                    className={`group rounded-xl border p-4 transition-colors hover:border-[#4cceac]/40 ${
                      isDark
                        ? "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"
                        : "border-slate-200/80 bg-white hover:bg-slate-50"
                    } ${focusRing}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          isDark ? "bg-white/5 text-[#4cceac]" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <action.icon className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-bold transition-colors group-hover:text-[#4cceac] ${heading}`}
                        >
                          {action.label}
                        </h4>
                        <p className={`mt-1 text-xs leading-relaxed ${muted}`}>
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
