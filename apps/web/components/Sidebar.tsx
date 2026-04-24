import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUser } from "@clerk/react";
import { motion } from "motion/react";
import {
  HomeIcon,
  UsersIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  ServerStackIcon,
  CommandLineIcon,
  SparklesIcon as SparklesIconFilled,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
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
  const sections = [
    {
      title: null,
      items: [{ name: "Dashboard", path: "/", icon: HomeIcon }],
    },
    {
      title: "AI Intelligence",
      items: [{ name: "AI Chat", path: "/chat", icon: QuestionMarkCircleIcon }],
    },
    {
      title: "Demo Showcases",
      items: [
        {
          name: "Creative Showcase",
          path: "/creative-showcase",
          icon: SparklesIconFilled,
        },
      ],
    },
    {
      title: "Data Management",
      items: [
        { name: "Manage Demo", path: "/manage-demo", icon: UsersIcon },
        {
          name: "Manage SFTP",
          path: "/manage-sftp",
          icon: ServerStackIcon,
        },
        { name: "Build Demo", path: "/build-demo", icon: UserPlusIcon },
        { name: "Upload", path: "/upload", icon: ArrowUpTrayIcon },
        {
          name: "Test data",
          path: "/test-data",
          icon: ClipboardDocumentListIcon,
        },
        {
          name: "Documentation",
          path: "/documentation",
          icon: DocumentTextIcon,
        },
      ],
    },
    {
      title: "Administration",
      items:
        normalizedRole === "admin"
          ? [
              {
                name: "User & Permissions",
                path: "/admin/users",
                icon: ShieldCheckIcon,
              },
            ]
          : [],
    },
  ];
  const visibleSections = sections.filter((section) => section.items.length > 0);

  return (
    <motion.nav
      initial={false}
      animate={{
        width: isCollapsed ? 84 : 280,
        transition: { type: "spring", stiffness: 400, damping: 40 },
      }}
      className="bg-[#0f172a]/80 backdrop-blur-2xl flex flex-col h-screen fixed top-0 left-0 z-50 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.3)] overflow-hidden"
    >
      {/* Header / Logo */}
      <div
        className={`h-20 flex items-center px-6 mb-4 ${isCollapsed ? "justify-center" : "justify-start"}`}
      >
        {isCollapsed ? (
          <div className="w-10 h-10 bg-gradient-to-br from-[#4cceac] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#4cceac]/20 shrink-0">
            <CommandLineIcon className="w-6 h-6 text-white" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#4cceac] to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#4cceac]/20">
              <CommandLineIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">
              Yomedia<span className="text-[#4cceac]">AI</span>
            </span>
          </motion.div>
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
          <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4cceac]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
              <div className="absolute -inset-2 bg-[#4cceac]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
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

            <h2 className="text-lg font-bold text-white mt-4 tracking-tight truncate w-full">
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
            {section.title && !isCollapsed && (
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-white text-[10px] font-black uppercase tracking-[0.25em] mb-4 px-4"
              >
                {section.title}
              </motion.h3>
            )}
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="relative block"
                    title={isCollapsed ? item.name : ""}
                  >
                    <motion.div
                      whileHover={{ x: isCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center ${isCollapsed ? "justify-center" : "gap-4 px-4"} py-3 rounded-2xl transition-all duration-300 group relative ${
                        isActive
                          ? "text-[#4cceac] bg-[#4cceac]/10 shadow-[inset_0_0_20px_rgba(76,206,172,0.05)]"
                          : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {isActive && !isCollapsed && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 w-1 h-6 bg-[#4cceac] rounded-r-full shadow-[0_0_15px_rgba(76,206,172,0.5)]"
                        />
                      )}
                      <item.icon
                        className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(76,206,172,0.5)]" : "group-hover:scale-110 group-hover:text-white"}`}
                      />
                      {!isCollapsed && (
                        <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
                          {item.name}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-2 bg-[#1e293b] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-white/5 shadow-2xl z-[60]">
                          {item.name}
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

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#475569] uppercase tracking-widest">
            <span>v1.2.0</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cceac] animate-pulse" />
              System Online
            </span>
          </div>
        </div>
      )}
    </motion.nav>
  );
};

export default Sidebar;
