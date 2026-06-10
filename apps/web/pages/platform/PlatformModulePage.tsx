import React from "react";
import { ArrowPathIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import PlatformModulePanel from "../../components/platform/PlatformModulePanel";
import type { PlatformModuleData, PlatformModuleKey } from "../../components/platform/types";
import { useLanguage, type NavMessageKey } from "../../contexts/LanguageContext";
import { api } from "../../lib/trpc/api";
import Button from "../../components/Button";

const MODULE_SOURCE_URL: Record<PlatformModuleKey, string> = {
  banner: "https://platform.yomedia.vn/banner",
  flight: "https://platform.yomedia.vn/flight",
  placement: "https://platform.yomedia.vn/placement",
  campaign: "https://platform.yomedia.vn/campaign",
  report: "https://platform.yomedia.vn/reports",
};

const MODULE_NAME_COLUMN: Record<
  Exclude<PlatformModuleKey, "report">,
  string
> = {
  banner: "banner_name",
  flight: "flight_name",
  placement: "placement_name",
  campaign: "campaign_name",
};

type PlatformModulePageProps = {
  module: PlatformModuleKey;
  titleKey: NavMessageKey;
};

const PlatformModulePage: React.FC<PlatformModulePageProps> = ({
  module,
  titleKey,
}) => {
  const { tNav } = useLanguage();
  const title = tNav(titleKey);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PlatformModuleData | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.platformPages.module(module);
      if (!res?.ok || !res.page) {
        throw new Error("Không tải được dữ liệu platform");
      }
      setData(res.page as PlatformModuleData);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [module]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sourceUrl = MODULE_SOURCE_URL[module];
  const sourceLabel = sourceUrl.replace("https://platform.yomedia.vn", "");

  return (
    <div className="w-full px-8 pt-10 space-y-6 pb-16">
      <header className="relative mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <GlobeAltIcon className="w-6 h-6 text-[#4cceac]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                {title}
              </h1>
              <p className="text-[#a3a3a3] text-xs font-medium mt-1 max-w-xl">
                Dữ liệu từ{" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#4cceac] hover:underline"
                >
                  {sourceUrl}
                </a>
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/90 bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Tải lại
          </Button>
        </div>
        <div className="absolute -bottom-4 left-0 w-full h-px bg-gradient-to-r from-[#4cceac]/50 via-[#3d465d] to-transparent" />
      </header>

      {error ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-1">
          <p className="font-semibold">Không tải được dữ liệu platform</p>
          <p>{error}</p>
          <p className="text-amber-200/70">
            Kiểm tra `YOMEDIA_PLATFORM_USERNAME` / `YOMEDIA_PLATFORM_PASSWORD`
            trong `apps/server/.env` và restart server.
          </p>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-white/5 bg-[#141b2d] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 space-y-5">
          {loading && !data ? (
            <p className="text-sm text-[#a3a3a3] text-center py-12">
              Đang đăng nhập platform và tải dữ liệu…
            </p>
          ) : null}
          {data ? (
            <>
              <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Module
                  </dt>
                  <dd className="text-white/90 mt-1">{data.title}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Profile
                  </dt>
                  <dd className="text-white/90 mt-1">
                    {data.profileName ?? "—"}
                    {data.profileRole ? (
                      <span className="text-[#94a3b8]">
                        {" "}
                        · {data.profileRole}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#0d111a]/60 px-3 py-2">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3]">
                    Fetched at
                  </dt>
                  <dd className="text-white/90 mt-1 font-mono text-xs">
                    {data.fetchedAt}
                  </dd>
                </div>
              </dl>

              <PlatformModulePanel
                heading={title}
                sourceUrl={data.url}
                sourceLabel={sourceLabel}
                createForm={data.createForm}
                grid={data.grid}
                nameColumn={
                  module === "report"
                    ? "id"
                    : MODULE_NAME_COLUMN[module]
                }
                showAllColumns={module === "placement"}
                enableGetCode={module === "placement"}
                hideGrid={module === "report"}
                gridEmptyMessage={
                  module === "report"
                    ? "Báo cáo trên platform cần chọn bộ lọc (thời gian, Ad View, Campaign, Flight, …) trước khi chạy. Các trường lọc được hiển thị ở trên."
                    : undefined
                }
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PlatformModulePage;
