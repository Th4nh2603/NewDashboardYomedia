
import React from 'react';
import Sidebar from './Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  MagnifyingGlassIcon, 
  MoonIcon, 
  SunIcon,
  BellIcon, 
  Cog6ToothIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex bg-[#141b2d] text-[#e0e0e0] min-h-screen font-sans selection:bg-[#4cceac]/30">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <motion.div 
        animate={{ 
          marginLeft: isCollapsed ? 84 : 280,
          transition: { type: "spring", stiffness: 400, damping: 40 }
        }}
        className="flex-1 flex flex-col min-h-screen"
      >
        {/* Top Bar */}
        <header className="h-20 flex items-center justify-between px-10 sticky top-0 bg-[#141b2d]/40 backdrop-blur-xl z-40 border-b border-white/5">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center bg-[#1f2a40]/50 backdrop-blur-md rounded-xl px-4 py-2 w-80 border border-white/5 focus-within:border-[#4cceac]/50 transition-all duration-300 group shadow-inner"
          >
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder-[#a3a3a3] text-[#e0e0e0]"
            />
            <MagnifyingGlassIcon className="w-4 h-4 text-[#a3a3a3] group-focus-within:text-[#4cceac] transition-colors" />
          </motion.div>

          <div className="flex items-center gap-2">
            {[
              { icon: theme === 'dark' ? SunIcon : MoonIcon, onClick: toggleTheme, id: 'theme' },
              { icon: BellIcon, id: 'notifications' },
              { icon: Cog6ToothIcon, id: 'settings' },
              { icon: UserIcon, id: 'profile' },
              { icon: ArrowRightOnRectangleIcon, onClick: logout, id: 'logout' }
            ].map((item, idx) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.9 }}
                onClick={item.onClick}
                className={`p-2.5 rounded-xl transition-colors relative ${
                  item.id === 'logout' ? 'text-red-400 hover:text-red-300' : 'text-[#a3a3a3] hover:text-[#e0e0e0]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.id === 'notifications' && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#4cceac] rounded-full border-2 border-[#141b2d]"></span>
                )}
              </motion.button>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 p-10 overflow-y-auto custom-scrollbar"
        >
          {children}
        </motion.main>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
