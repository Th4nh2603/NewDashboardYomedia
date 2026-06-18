import React from "react";
import { useLocation } from "react-router-dom";
import AdminOfflineFetchGate from "@/components/layout/AdminOfflineFetchGate";
import Sidebar from "@/components/layout/Sidebar";
import { useTheme } from "@/stores/ThemeContext";
import { useLanguage, type AppLocale } from "@/stores/LanguageContext";
import { useAuth } from "@/stores/AuthContext";
import { recordActivity } from "@/utils/activityLog";
import { motion } from "motion/react";
import {
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  Cog6ToothIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const LANG_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, tLayout } = useLanguage();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const settingsRef = React.useRef<HTMLDivElement>(null);
  const ThemeToggleIcon = theme === "dark" ? SunIcon : MoonIcon;
  const isDark = theme === "dark";

  React.useEffect(() => {
    if (!settingsOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      )
        setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [settingsOpen]);

  const handleLogout = React.useCallback(() => {
    void recordActivity({
      user,
      action: "logout",
      area: "Auth",
      description: "Signed out",
      target: location.pathname || "/",
    });
    logout();
  }, [location.pathname, logout, user]);

  return (
    <div
      className={`flex min-h-screen font-sans selection:bg-[#4cceac]/30 ${
        isDark ? "bg-[#141b2d] text-[#e0e0e0]" : "bg-slate-100 text-slate-900"
      }`}
    >
      <AdminOfflineFetchGate />
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <motion.div
        animate={{
          marginLeft: isCollapsed ? 84 : 280,
          transition: { type: "spring", stiffness: 400, damping: 40 },
        }}
        className="flex-1 flex flex-col min-h-screen relative"
      >
        <div className="dashboard-ambient" aria-hidden>
          <div className="dashboard-ambient-grid" />
        </div>

        {/* Top Bar */}
        <header
          className={`h-20 flex items-center justify-between px-10 sticky top-0 backdrop-blur-xl z-[100] border-b relative isolate ${
            isDark
              ? "bg-[#141b2d]/65 border-white/5"
              : "bg-white/90 border-slate-200/80 shadow-sm shadow-slate-200/40"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center backdrop-blur-md rounded-xl px-4 py-2 w-80 focus-within:border-[#4cceac]/50 transition-all duration-300 group ${
              isDark
                ? "bg-[#1f2a40]/50 border border-white/5 shadow-inner"
                : "bg-white border border-slate-200/80 shadow-sm"
            }`}
          >
            <input
              type="text"
              placeholder={tLayout("searchPlaceholder")}
              className={`bg-transparent border-none outline-none text-sm w-full ${
                isDark
                  ? "placeholder-[#a3a3a3] text-[#e0e0e0]"
                  : "placeholder-slate-400 text-slate-900"
              }`}
            />
            <MagnifyingGlassIcon
              className={`w-4 h-4 group-focus-within:text-[#4cceac] transition-colors ${
                isDark ? "text-[#a3a3a3]" : "text-slate-500"
              }`}
            />
          </motion.div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0 }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? tLayout("themeAriaUseLight")
                  : tLayout("themeAriaUseDark")
              }
              className={`p-2.5 rounded-xl transition-colors relative cursor-pointer z-[1] ${
                isDark
                  ? "text-[#a3a3a3] hover:text-[#e0e0e0]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ThemeToggleIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
              whileTap={{ scale: 0.9 }}
              className={`p-2.5 rounded-xl transition-colors relative cursor-pointer ${
                isDark
                  ? "text-[#a3a3a3] hover:text-[#e0e0e0]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <BellIcon className="w-5 h-5" />
              <span
                className={`absolute top-2 right-2 w-2 h-2 bg-[#4cceac] rounded-full border-2 ${
                  isDark ? "border-[#141b2d]" : "border-white"
                }`}
              />
            </motion.button>

            <div ref={settingsRef} className="relative">
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{
                  scale: 1.1,
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
                whileTap={{ scale: 0.9 }}
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`p-2.5 rounded-xl transition-colors relative cursor-pointer ${
                  isDark
                    ? `text-[#a3a3a3] hover:text-[#e0e0e0] ${settingsOpen ? "bg-white/5 text-[#e0e0e0]" : ""}`
                    : `text-slate-500 hover:text-slate-900 ${settingsOpen ? "bg-slate-200/60 text-slate-900" : ""}`
                }`}
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </motion.button>

              {settingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 top-[calc(100%+0.5rem)] z-[110] min-w-[11rem] rounded-xl py-2 shadow-xl backdrop-blur-md ${
                    isDark
                      ? "border border-white/10 bg-[#1f2a40]/98 shadow-black/40"
                      : "border border-slate-200 bg-white shadow-slate-300/40"
                  }`}
                >
                  <div
                    className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                      isDark ? "text-[#737373]" : "text-slate-500"
                    }`}
                  >
                    {tLayout("languageMenu")}
                  </div>
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setLocale(opt.value);
                        setSettingsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition-colors ${
                        isDark ? "hover:bg-white/5" : "hover:bg-slate-100"
                      } ${
                        locale === opt.value
                          ? "text-[#4cceac]"
                          : isDark
                            ? "text-[#e0e0e0]"
                            : "text-slate-800"
                      }`}
                    >
                      {opt.label}
                      {locale === opt.value && (
                        <CheckIcon className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
              whileTap={{ scale: 0.9 }}
              className={`p-2.5 rounded-xl transition-colors relative cursor-pointer ${
                isDark
                  ? "text-[#a3a3a3] hover:text-[#e0e0e0]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2.5 rounded-xl transition-colors relative cursor-pointer text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </header>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6 lg:p-8 relative z-10"
        >
          {children}
        </motion.main>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
