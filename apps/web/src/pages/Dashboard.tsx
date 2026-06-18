import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  SparklesIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentIcon,
  BoltIcon,
  RectangleStackIcon,
  ChartBarIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/stores/ThemeContext";
import { useLanguage } from "@/stores/LanguageContext";

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const { tDashboard } = useLanguage();
  const isDark = theme === "dark";

  const shell = isDark
    ? "border-white/[0.08] bg-[#1a2336]/75 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
    : "border-slate-200/90 bg-white/80 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]";
  const muted = isDark ? "text-[#94a3b8]" : "text-slate-500";
  const heading = isDark ? "text-white" : "text-slate-900";
  const subCard = isDark
    ? "border-white/[0.06] bg-[#151d2f]/90"
    : "border-slate-200/80 bg-slate-50/90";

  const quickActions = React.useMemo(
    () => [
      {
        name: tDashboard("quickAiChatName"),
        desc: tDashboard("quickAiChatDesc"),
        path: "/chat",
        icon: ChatBubbleBottomCenterTextIcon,
        accent: "from-indigo-500/90 to-violet-600/90",
        iconBg: isDark ? "bg-indigo-500/15" : "bg-indigo-500/12",
        iconClr: "text-indigo-400",
      },
      {
        name: tDashboard("quickImageName"),
        desc: tDashboard("quickImageDesc"),
        path: "/image-generator",
        icon: PhotoIcon,
        accent: "from-[#4cceac]/90 to-teal-600/90",
        iconBg: isDark ? "bg-[#4cceac]/15" : "bg-emerald-500/12",
        iconClr: "text-[#4cceac]",
      },
      {
        name: tDashboard("quickVisionName"),
        desc: tDashboard("quickVisionDesc"),
        path: "/vision",
        icon: SparklesIcon,
        accent: "from-amber-500/90 to-orange-600/85",
        iconBg: isDark ? "bg-amber-500/15" : "bg-amber-500/12",
        iconClr: "text-amber-400",
      },
      {
        name: tDashboard("quickBuildDemoName"),
        desc: tDashboard("quickBuildDemoDesc"),
        path: "/build-demo",
        icon: WrenchScrewdriverIcon,
        accent: "from-sky-500/90 to-blue-700/85",
        iconBg: isDark ? "bg-sky-500/15" : "bg-sky-500/12",
        iconClr: "text-sky-400",
      },
      {
        name: tDashboard("quickShowcaseName"),
        desc: tDashboard("quickShowcaseDesc"),
        path: "/creative",
        icon: RectangleStackIcon,
        accent: "from-fuchsia-500/85 to-purple-700/85",
        iconBg: isDark ? "bg-fuchsia-500/15" : "bg-fuchsia-500/10",
        iconClr: "text-fuchsia-400",
      },
      {
        name: tDashboard("quickDocsName"),
        desc: tDashboard("quickDocsDesc"),
        path: "/documentation",
        icon: DocumentIcon,
        accent: "from-slate-500/80 to-slate-700/80",
        iconBg: isDark ? "bg-white/10" : "bg-slate-500/10",
        iconClr: isDark ? "text-slate-300" : "text-slate-600",
      },
    ],
    [tDashboard, isDark],
  );

  const stats = React.useMemo(
    () => [
      {
        label: tDashboard("statCampaignsLabel"),
        value: "12",
        hint: tDashboard("statCampaignsHint"),
        icon: RocketLaunchIcon,
        ring: "from-[#4cceac]/40 to-transparent",
      },
      {
        label: tDashboard("statAssetsLabel"),
        value: "248",
        hint: tDashboard("statAssetsHint"),
        icon: BoltIcon,
        ring: "from-amber-400/35 to-transparent",
      },
      {
        label: tDashboard("statBriefLabel"),
        value: "94%",
        hint: tDashboard("statBriefHint"),
        icon: ChartBarIcon,
        ring: "from-indigo-400/35 to-transparent",
      },
      {
        label: tDashboard("statModelLabel"),
        value: tDashboard("statModelValue"),
        hint: tDashboard("statModelHint"),
        icon: CpuChipIcon,
        ring: "from-fuchsia-400/30 to-transparent",
      },
    ],
    [tDashboard],
  );

  return (
    <div className="flex flex-col gap-10 max-w-[1600px] mx-auto w-full pb-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative overflow-hidden rounded-[2rem] border p-8 md:p-10 ${shell}`}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-70 bg-gradient-to-br from-[#4cceac]/30 to-indigo-600/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/15"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${isDark ? "border-[#4cceac]/35 bg-[#4cceac]/10 text-[#4cceac]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4cceac] animate-pulse" />
              {tDashboard("workspaceBadge")}
            </span>
            <h1
              className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] ${heading}`}
            >
              {tDashboard("heroTitleLead")}
              <span className="bg-gradient-to-r from-[#4cceac] via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                {tDashboard("heroTitleAccent")}
              </span>
            </h1>
            <p className={`text-base md:text-lg leading-relaxed ${muted}`}>
              {tDashboard("heroSubtitle")}
            </p>
          </div>
          <Link
            to="/chat"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4cceac]/20 bg-gradient-to-r from-[#4cceac] to-indigo-600 hover:brightness-110 transition-all shrink-0`}
          >
            {tDashboard("ctaChat")}
            <SparklesIcon className="h-5 w-5 opacity-90" />
          </Link>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className={`relative rounded-2xl border p-5 overflow-hidden ${subCard}`}
          >
            <div
              className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${s.ring}`}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div
                className={`rounded-xl p-2 ${isDark ? "bg-white/5" : "bg-white shadow-sm border border-slate-200/60"}`}
              >
                <s.icon className={`h-5 w-5 ${muted}`} />
              </div>
            </div>
            <p
              className={`relative mt-4 text-2xl font-black tabular-nums ${heading}`}
            >
              {s.value}
            </p>
            <p
              className={`relative text-xs font-semibold uppercase tracking-wide mt-1 ${muted}`}
            >
              {s.label}
            </p>
            <p className={`relative text-[11px] mt-2 ${muted} opacity-80`}>
              {s.hint}
            </p>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h2 className={`text-xl font-black ${heading}`}>
              {tDashboard("quickTitle")}
            </h2>
            <p className={`text-sm mt-1 ${muted}`}>
              {tDashboard("quickSubtitle")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {quickActions.map((action, i) => (
            <Link key={action.path} to={action.path}>
              <motion.article
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                className={`group h-full rounded-2xl border p-6 relative overflow-hidden ${shell}`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${action.accent} opacity-90`}
                  aria-hidden
                />
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl p-3.5 shrink-0 ${action.iconBg} ring-1 ${isDark ? "ring-white/10" : "ring-black/[0.04]"}`}
                  >
                    <action.icon className={`w-7 h-7 ${action.iconClr}`} />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`font-bold text-lg ${heading} group-hover:text-[#4cceac] transition-colors`}
                    >
                      {action.name}
                    </h3>
                    <p className={`text-sm mt-1 leading-snug ${muted}`}>
                      {action.desc}
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${muted}`}
                >
                  {tDashboard("quickOpenTool")}
                  <span
                    className={`transition-transform group-hover:translate-x-1 ${heading}`}
                  >
                    →
                  </span>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
