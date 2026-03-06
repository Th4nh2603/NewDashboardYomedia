import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CpuChipIcon,
  BoltIcon,
  SignalIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

const Bar: React.FC = () => {
  const [metrics, setMetrics] = useState({
    gpu: 12,
    ram: 2.4,
    latency: 18,
    health: 'Optimal',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        gpu: Math.max(5, Math.min(95, prev.gpu + (Math.random() * 10 - 5))),
        ram: Math.max(1, Math.min(16, prev.ram + (Math.random() * 0.4 - 0.2))),
        latency: Math.max(
          10,
          Math.min(150, prev.latency + (Math.random() * 20 - 10)),
        ),
        health: prev.gpu > 85 ? 'Warning' : 'Optimal',
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0] tracking-tight">
            System Performance Monitor
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#64748b]">
            Realtime infrastructure telemetry
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#a3a3a3]">
          <span
            className={`w-2 h-2 rounded-full ${
              metrics.health === 'Optimal' ? 'bg-[#4cceac]' : 'bg-amber-500'
            } animate-pulse`}
          />
          <span className="text-white">{metrics.health}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#141b2d] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-[#4cceac]/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4cceac] to-transparent opacity-30" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-[#4cceac]/10 rounded-xl">
              <CpuChipIcon className="w-5 h-5 text-[#4cceac]" />
            </div>
            <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-[0.2em]">
              GPU Core
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tracking-tighter">
              {Math.round(metrics.gpu)}
            </span>
            <span className="text-xs font-bold text-[#4cceac] opacity-60">
              %
            </span>
          </div>
          <div className="mt-5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${metrics.gpu}%` }}
              className={`h-full rounded-full ${
                metrics.gpu > 80 ? 'bg-amber-500' : 'bg-[#4cceac]'
              }`}
            />
          </div>
        </div>

        <div className="bg-[#141b2d] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-30" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <ServerIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-[0.2em]">
              VRAM Alloc
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tracking-tighter">
              {metrics.ram.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-indigo-400 opacity-60">
              GB
            </span>
          </div>
          <div className="mt-5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(metrics.ram / 16) * 100}%` }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
        </div>

        <div className="bg-[#141b2d] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent opacity-30" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <SignalIcon className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-[0.2em]">
              Net Latency
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tracking-tighter">
              {Math.round(metrics.latency)}
            </span>
            <span className="text-xs font-bold text-rose-400 opacity-60">
              ms
            </span>
          </div>
          <div className="mt-5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{
                width: `${Math.min(100, (metrics.latency / 200) * 100)}%`,
              }}
              className={`h-full rounded-full ${
                metrics.latency > 100 ? 'bg-rose-500' : 'bg-rose-400'
              }`}
            />
          </div>
        </div>

        <div className="bg-[#141b2d] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <BoltIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[8px] font-black text-[#a3a3a3] uppercase tracking-[0.2em]">
              IO Flow
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tracking-tighter">
              {metrics.health === 'Optimal' ? '1.2' : '0.6'}
            </span>
            <span className="text-xs font-bold text-emerald-400 opacity-60">
              GB/s
            </span>
          </div>
          <div className="mt-5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: metrics.health === 'Optimal' ? '75%' : '40%' }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#141b2d] border border-white/5 rounded-3xl p-6 font-mono">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-[#4cceac] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4cceac] animate-pulse" />
            Live System Feed
          </span>
          <span className="text-[10px] text-[#3d465d] font-bold uppercase tracking-widest">
            Buffer: 1024kb
          </span>
        </div>
        <div className="space-y-2 h-32 overflow-hidden text-[10px] text-[#a3a3a3]">
          <p className="flex gap-4">
            <span className="text-[#4cceac]">[OK]</span> Initializing neural
            engine v4.2.0...
          </p>
          <p className="flex gap-4">
            <span className="text-[#4cceac]">[OK]</span> Handshaking with Gemini
            3.1 Pro cluster...
          </p>
          <p className="flex gap-4">
            <span className="text-[#4cceac]">[OK]</span> Allocating 2.4GB VRAM
            for processing...
          </p>
          <p className="flex gap-4">
            <span className="text-indigo-400">[INFO]</span> System health check:
            {` ${metrics.health}`}
          </p>
          <p className="flex gap-4">
            <span className="text-[#4cceac]">[OK]</span> Ready for asset
            ingestion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Bar;

