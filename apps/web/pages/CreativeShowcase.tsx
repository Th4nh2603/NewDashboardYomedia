import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Square3Stack3DIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  VideoCameraIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";

interface DemoItem {
  id: string;
  title: string;
  image: string;
  size: string;
  position: string;
  fileType: string;
  category: "Display" | "Video" | "Mobile";
}

const CreativeShowcase: React.FC = () => {
  const [items, setItems] = useState<DemoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "Display" | "Video" | "Mobile">(
    "All",
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDemos = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl =
          (import.meta.env as any).VITE_SERVER_URL || window.location.origin;
        const res = await fetch(`${baseUrl}/api/creative-demos`);
        const data = await res.json();
        if (!res.ok || !data.ok || !Array.isArray(data.demos)) {
          throw new Error(data.error || "Unable to load creative demos");
        }
        setItems(data.demos);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load creative demos",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchDemos();
  }, []);

  const filteredData = items.filter((item) => {
    const matchesFilter = filter === "All" || item.category === filter;
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full px-8 pt-10 space-y-8">
      <div className="max-w-full mx-auto">
        <header className="mb-10 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-6 bg-[#4cceac] rounded-full" />
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  Creative Showcase
                </h1>
              </div>
              <p className="text-[#a3a3a3] font-medium tracking-widest uppercase text-[9px] ml-4">
                Interactive Ad Format Demos &amp; Specifications
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search formats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#141b2d] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium text-white outline-none focus:border-[#4cceac]/50 transition-all w-64 shadow-xl"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3] group-focus-within:text-[#4cceac] transition-colors" />
              </div>

              <div className="flex items-center gap-2 bg-[#141b2d] p-1.5 rounded-2xl border border-white/5 shadow-xl">
                {["All", "Display", "Video", "Mobile"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === f
                        ? "bg-[#4cceac] text-[#141b2d] shadow-lg shadow-[#4cceac]/20"
                        : "text-[#a3a3a3] hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#a3a3a3]">
            Loading creative demos...
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredData.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group relative bg-[#141b2d] rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-[#4cceac]/30 transition-all duration-500 shadow-2xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141b2d] via-transparent to-transparent opacity-60" />

                  <div className="absolute top-4 left-4">
                    <span className="bg-[#141b2d]/80 backdrop-blur-md border border-white/10 text-[#4cceac] text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      {item.category}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-[#4cceac]/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-[#4cceac] text-[#141b2d] px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-2xl shadow-[#4cceac]/40"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Launch Demo
                    </motion.button>
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-xl font-black text-white mb-6 tracking-tight uppercase italic group-hover:text-[#4cceac] transition-colors">
                    {item.title}
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Square3Stack3DIcon className="w-4 h-4 text-[#a3a3a3]" />
                        <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                          Size
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white">
                        {item.size}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="w-4 h-4 text-[#a3a3a3]" />
                        <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                          Position
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white">
                        {item.position}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CommandLineIcon className="w-4 h-4 text-[#a3a3a3]" />
                        <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">
                          File Type
                        </span>
                      </div>
                      <span className="text-xs font-medium text-white">
                        {item.fileType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent to-[#4cceac]/5 pointer-events-none" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}

        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[#141b2d] rounded-3xl flex items-center justify-center mb-6 border border-white/5">
              <MagnifyingGlassIcon className="w-10 h-10 text-[#3d465d]" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-2">
              No formats found
            </h3>
            <p className="text-[#a3a3a3] text-sm font-medium">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeShowcase;
