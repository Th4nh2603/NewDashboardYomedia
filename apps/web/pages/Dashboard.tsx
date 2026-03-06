
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import DataTable from '../components/DataTable';
import { 
  MagnifyingGlassIcon, 
  CloudArrowDownIcon, 
  PrinterIcon, 
  ViewColumnsIcon, 
  FunnelIcon,
  SparklesIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const headers = ['ID', 'YEAR', 'MONTH', 'BRAND', 'HOST', 'VIEW', 'FORMAT', 'FLIGHT'];

  const [testingSftp, setTestingSftp] = React.useState(false);
  const [sftpStatus, setSftpStatus] = React.useState<string | null>(null);
  
  const data = Array.from({ length: 15 }, (_, i) => ({
    ID: i + 1,
    YEAR: 2019,
    MONTH: 1,
    BRAND: 'carrier-junior',
    HOST: 'demo',
    VIEW: 'eye',
    FORMAT: i < 3 ? 'firstview' : i < 11 ? 'inpage' : i === 11 ? 'video' : 'inpage',
    FLIGHT: ''
  }));

  const quickActions = [
    { name: 'AI Chat', path: '/chat', icon: ChatBubbleBottomCenterTextIcon, color: 'bg-indigo-500/10 text-indigo-400' },
    { name: 'Generate Image', path: '/image-generator', icon: PhotoIcon, color: 'bg-[#4cceac]/10 text-[#4cceac]' },
    { name: 'Vision AI', path: '/vision', icon: SparklesIcon, color: 'bg-amber-500/10 text-amber-400' },
  ];

  const handleTestSftp = async () => {
    setTestingSftp(true);
    setSftpStatus(null);

    try {
      const baseUrl =
        import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/sftp/connect`);
      const data = await response.json();

      if (response.ok && data.ok) {
        setSftpStatus(
          `Connected to ${data.host}:${data.port}${
            data.cwd ? ` (cwd: ${data.cwd})` : ''
          }`
        );
      } else {
        setSftpStatus(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setSftpStatus(
        `Failed: ${
          error instanceof Error ? error.message : 'Unknown network error'
        }`
      );
    } finally {
      setTestingSftp(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex justify-between items-end">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-[#e0e0e0] tracking-tight">DEMO</h1>
          <p className="text-[#4cceac] font-medium mt-1">Welcome to your AI Creative Suite</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, idx) => (
          <Link key={action.name} to={action.path}>
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-6 rounded-3xl border border-white/5 bg-[#1f2a40]/50 backdrop-blur-sm shadow-xl flex items-center gap-4 group transition-all`}
            >
              <div className={`p-3 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[#e0e0e0] font-bold">{action.name}</h3>
                <p className="text-[#a3a3a3] text-xs mt-0.5">Quick access to AI tools</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#e0e0e0]">Recent Data</h2>
            <div className="flex items-center gap-4">
              <MagnifyingGlassIcon className="w-5 h-5 text-[#a3a3a3] hover:text-[#e0e0e0] cursor-pointer transition-colors" />
              <CloudArrowDownIcon className="w-5 h-5 text-[#a3a3a3] hover:text-[#e0e0e0] cursor-pointer transition-colors" />
              <PrinterIcon className="w-5 h-5 text-[#a3a3a3] hover:text-[#e0e0e0] cursor-pointer transition-colors" />
              <ViewColumnsIcon className="w-5 h-5 text-[#a3a3a3] hover:text-[#e0e0e0] cursor-pointer transition-colors" />
              <FunnelIcon className="w-5 h-5 text-[#a3a3a3] hover:text-[#e0e0e0] cursor-pointer transition-colors" />
            </div>
          </div>

          <div className="bg-[#1f2a40] rounded-3xl border border-[#3d465d] overflow-hidden shadow-2xl">
            <DataTable headers={headers} data={data} />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#1f2a40]/80 border border-[#3d465d] shadow-2xl flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-[#e0e0e0]">
            Server connectivity
          </h2>
          <p className="text-xs text-[#a3a3a3]">
            Test the SFTP connection configured in your server app.
          </p>
          <button
            onClick={handleTestSftp}
            disabled={testingSftp}
            className="mt-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#4cceac] text-[#141b2d] text-sm font-semibold hover:bg-[#6ee7c7] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {testingSftp ? 'Testing SFTP…' : 'Test SFTP'}
          </button>
          {sftpStatus && (
            <p className="mt-1 text-xs text-[#e0e0e0] break-words">
              {sftpStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
