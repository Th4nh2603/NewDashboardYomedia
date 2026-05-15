import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage, type NavMessageKey } from "../contexts/LanguageContext";
import { useAdminOfflineMode } from "../hooks/useAdminOfflineMode";
import { useServerReachable } from "../hooks/useServerReachable";
import { useUser } from "@clerk/react";
import { motion } from "motion/react";
import {
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  QuestionMarkCircleIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  EnvelopeOpenIcon,
  ServerStackIcon,
  CommandLineIcon,
  SparklesIcon as SparklesIconFilled,
  TableCellsIcon,
  WrenchScrewdriverIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

function SidebarAdminOfflineToggle({
  isCollapsed,
  isDark,
}: {
  isCollapsed: boolean;
  isDark: boolean;
}) {
  const { tLayout } = useLanguage();
  const { enabled, toggle } = useAdminOfflineMode();
  return (
    <motion.button
      type="button"
      layout
      onClick={() => toggle()}
      title={tLayout("adminOfflineModeAria")}
      className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center gap-2"} rounded-2xl py-2.5 px-3 text-[10px] font-black uppercase tracking-widest transition-colors border ${
        enabled
          ? isDark
            ? "bg-amber-500/15 text-amber-200 border-amber-500/35 hover:bg-amber-500/25"
            : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
          : isDark
            ? "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200"
            : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
      }`}
    >
      <SignalSlashIcon
        className={`w-4 h-4 shrink-0 ${enabled ? "text-amber-400" : ""}`}
      />
      {!isCollapsed && (
        <span className="whitespace-nowrap">
          {enabled
            ? tLayout("adminOfflineModeActive")
            : tLayout("adminOfflineMode")}
        </span>
      )}
    </motion.button>
  );
}

/** Keeps `/api/health` polling next to its UI so status never references an out-of-scope name. */
function SidebarApiLine() {
  const reachable = useServerReachable();
  const { tNav } = useLanguage();
  return (
    <span className="flex items-center gap-1">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          reachable ? "bg-[#4cceac] animate-pulse" : "bg-amber-500 animate-none"
        }`}
      />
      {reachable ? tNav("systemOnline") : tNav("systemOffline")}
    </span>
  );
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { tNav, tLayout } = useLanguage();
  const { user } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const displayUser = user
    ? user
    : clerkUser
      ? {
          name:
            clerkUser.fullName ||
            clerkUser.firstName ||
            clerkUser.primaryEmailAddress?.emailAddress ||
            "User",
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          picture: clerkUser.imageUrl,
          role: "guest",
          roleTitle: "Clerk User",
        }
      : null;
  React.useEffect(() => {
    if (displayUser?.email) {
      console.log("Logged in email:", displayUser.email);
    }
  }, [displayUser?.email]);

  if (!displayUser && isClerkLoaded) return null;

  const roleTitleFromServer =
    displayUser && "roleTitle" in displayUser
      ? (displayUser as { roleTitle?: string }).roleTitle
      : undefined;
  const displayRole =
    roleTitleFromServer || displayUser?.role || "Creative Director";
  const normalizedRole = String(displayUser?.role || "")
    .trim()
    .toLowerCase();
  const allowedRouteSet = new Set(
    Array.isArray(displayUser?.allowedRoutes) ? displayUser.allowedRoutes : [],
  );
  const hasAllowedRouteConfig = allowedRouteSet.size > 0;
  type SectionSpec = {
    titleKey: NavMessageKey | null;
    items: {
      nameKey: NavMessageKey;
      path: string;
      icon: React.ComponentType<{ className?: string }>;
    }[];
  };

  const adminSectionItems: SectionSpec["items"] =
    normalizedRole !== "admin"
      ? []
      : ([
          ...(!hasAllowedRouteConfig || allowedRouteSet.has("/admin/users")
            ? [
                {
                  nameKey: "navUserPermissions" as const,
                  path: "/admin/users",
                  icon: ShieldCheckIcon,
                },
              ]
            : []),
          ...(!hasAllowedRouteConfig ||
          allowedRouteSet.has("/creative-demos-edit")
            ? [
                {
                  nameKey: "navCreativeDemosEdit" as const,
                  path: "/creative-demos-edit",
                  icon: TableCellsIcon,
                },
              ]
            : []),
          ...(!hasAllowedRouteConfig || allowedRouteSet.has("/manage-sftp")
            ? [
                {
                  nameKey: "navManageSftp" as const,
                  path: "/manage-sftp",
                  icon: ServerStackIcon,
                },
              ]
            : []),
          ...(!hasAllowedRouteConfig || allowedRouteSet.has("/smtp-mail")
            ? [
                {
                  nameKey: "navSmtpMail" as const,
                  path: "/smtp-mail",
                  icon: EnvelopeOpenIcon,
                },
              ]
            : []),
        ] satisfies SectionSpec["items"]);

  const sections: SectionSpec[] = [
    {
      titleKey: null,
      items: [{ nameKey: "navDashboard", path: "/", icon: HomeIcon }],
    },
    {
      titleKey: "sectionAiIntelligence",
      items: [
        { nameKey: "navAiChat", path: "/chat", icon: QuestionMarkCircleIcon },
      ],
    },
    {
      titleKey: "sectionTools",
      items: [
        {
          nameKey: "navBuildDemo",
          path: "/build-demo",
          icon: WrenchScrewdriverIcon,
        },
      ],
    },
    {
      titleKey: "sectionDataManagement",
      items: [
        {
          nameKey: "navCreativeShowcase",
          path: "/creative",
          icon: SparklesIconFilled,
        },
        { nameKey: "navManageDemo", path: "/manage-demo", icon: UsersIcon },
        { nameKey: "navUpload", path: "/upload", icon: ArrowUpTrayIcon },
        {
          nameKey: "navHistory",
          path: "/history",
          icon: ArchiveBoxIcon,
        },
        {
          nameKey: "navTestData",
          path: "/test-data",
          icon: ClipboardDocumentListIcon,
        },
        {
          nameKey: "navDocumentation",
          path: "/documentation",
          icon: DocumentTextIcon,
        },
      ],
    },
    {
      titleKey: "sectionAdministration",
      items: adminSectionItems,
    },
  ];
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !hasAllowedRouteConfig || allowedRouteSet.has(item.path),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <motion.nav
      initial={false}
      animate={{
        width: isCollapsed ? 84 : 280,
        transition: { type: "spring", stiffness: 400, damping: 40 },
      }}
      className={`flex flex-col h-screen fixed top-0 left-0 z-40 backdrop-blur-2xl overflow-hidden border-r ${
        isDark
          ? "bg-[#0f172a]/80 border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.3)]"
          : "bg-white/95 border-slate-200/80 shadow-lg"
      }`}
    >
      {/* Header / Logo */}
      <div
        className={`h-20 flex items-center mb-4 shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-between px-6 pr-4"}`}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4cceac] via-[#45b89c] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#4cceac]/25 ring-1 ring-white/15 shrink-0">
              <CommandLineIcon className="w-6 h-6 text-white" />
            </div>
            <motion.button
              type="button"
              aria-label={tLayout("expandSidebar")}
              onClick={() => setIsCollapsed(false)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark
                  ? "text-slate-500 hover:text-[#4cceac] hover:bg-white/10"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
            >
              <ChevronDoubleRightIcon className="w-5 h-5" />
            </motion.button>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#4cceac] via-[#45b89c] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#4cceac]/25 ring-1 ring-white/15 shrink-0">
                <CommandLineIcon className="w-6 h-6 text-white" />
              </div>
              <span
                className={`text-xl font-black tracking-tighter uppercase truncate ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Yomedia<span className="text-[#4cceac]">AI</span>
              </span>
            </motion.div>
            <motion.button
              type="button"
              aria-label={tLayout("collapseSidebar")}
              onClick={() => setIsCollapsed(true)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl shrink-0 transition-colors ${
                isDark
                  ? "text-slate-500 hover:text-[#4cceac] hover:bg-white/10"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
            >
              <ChevronDoubleLeftIcon className="w-5 h-5" />
            </motion.button>
          </>
        )}
      </div>

      {/* Profile Section */}
      {!isCollapsed && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 mb-10"
        >
          <div
            className={`rounded-3xl p-5 flex flex-col items-center text-center relative overflow-hidden group ${
              isDark
                ? "bg-white/5 border border-white/5"
                : "bg-slate-50 border border-slate-200/80 shadow-sm"
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4cceac]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="absolute -inset-2 bg-[#4cceac]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div
                className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 shadow-2xl ${
                  isDark ? "border-white/10" : "border-slate-200"
                }`}
              >
                <img
                  src={
                    displayUser?.picture ||
                    `https://picsum.photos/seed/${displayUser?.name || "nova"}/200/200`
                  }
                  alt={displayUser?.name || "User avatar"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <h2
              className={`text-lg font-bold mt-4 tracking-tight truncate w-full ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {displayUser?.name || "User"}
            </h2>
            <p className="text-[#4cceac] text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">
              {displayRole}
            </p>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex-1 px-4 pb-10 overflow-y-auto custom-scrollbar">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="mb-8">
            {section.titleKey && !isCollapsed && (
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 px-4 ${
                  isDark ? "text-white/90" : "text-slate-600"
                }`}
              >
                {tNav(section.titleKey)}
              </motion.h3>
            )}
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const label = tNav(item.nameKey);
                return (
                  <Link
                    key={item.path + item.nameKey}
                    to={item.path}
                    className="relative block"
                    title={isCollapsed ? label : ""}
                  >
                    <motion.div
                      whileHover={{ x: isCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center ${isCollapsed ? "justify-center" : "gap-4 px-4"} py-3 rounded-2xl transition-all duration-300 group relative ${
                        isActive
                          ? "text-[#4cceac] bg-[#4cceac]/10 shadow-[inset_0_0_20px_rgba(76,206,172,0.05)]"
                          : isDark
                            ? "text-[#94a3b8] hover:text-white hover:bg-white/5"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                    >
                      {isActive && !isCollapsed && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 w-1 h-6 bg-[#4cceac] rounded-r-full shadow-[0_0_15px_rgba(76,206,172,0.5)]"
                        />
                      )}
                      <item.icon
                        className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(76,206,172,0.5)]" : isDark ? "group-hover:scale-110 group-hover:text-white" : "group-hover:scale-110 group-hover:text-slate-900"}`}
                      />
                      {!isCollapsed && (
                        <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
                          {label}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-[#1e293b] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/5 shadow-2xl z-[60]">
                          {label}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: admin offline toggle — admin only; version row when sidebar expanded */}
      {(normalizedRole === "admin" || !isCollapsed) && (
        <div
          className={`p-6 border-t ${isDark ? "border-white/5" : "border-slate-200/80"}`}
        >
          {normalizedRole === "admin" && (
            <SidebarAdminOfflineToggle
              isCollapsed={isCollapsed}
              isDark={isDark}
            />
          )}
          {!isCollapsed && (
            <div
              className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-widest ${
                isDark ? "text-[#475569]" : "text-slate-500"
              } ${normalizedRole === "admin" ? "mt-3 pt-3 border-t border-dashed border-slate-500/20 dark:border-white/10" : ""}`}
            >
              <span>v1.2.0</span>
              <SidebarApiLine />
            </div>
          )}
        </div>
      )}
    </motion.nav>
  );
};

export default Sidebar;
