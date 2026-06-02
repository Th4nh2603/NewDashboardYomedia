import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchAdUnitOptionsForAdView,
  fetchBannerSettingsForTemplate,
  fetchPlatformBannerPage,
  fetchTemplateOptionsForAdView,
  submitBannerCreate,
} from "../../services/yomediaPlatform.js";
import { adminProcedure, router, runHandler } from "../trpc.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadAdvertiserOptionsFromData(): Array<{ value: string; label: string }> {
  const path = join(__dirname, "../../data/banner-create-options.json");
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw) as {
    selects?: Array<{
      id: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  };
  const advertiser = data.selects?.find((s) => s.id === "advertiser");
  return advertiser?.options ?? [];
}

const bannerCreateSubmitSchema = z.object({
  banner_name: z.string(),
  advertiser: z.string(),
  market: z.string(),
  landing_page: z.string(),
  ad_view: z.string(),
  adunit: z.string(),
  type: z.string(),
  template: z.string().optional(),
  use_tag: z.string(),
  code_tag: z.string(),
  notes: z.string(),
  width: z.string(),
  height: z.string(),
  active: z.number(),
  source: z.string(),
  banner_settings: z.record(z.union([z.string(), z.number()])),
});

export const toolTestRouter = router({
  platformBanner: adminProcedure.query(() =>
    runHandler(async () => {
      const page = await fetchPlatformBannerPage();
      return { ok: true as const, page };
    }),
  ),
  bannerAdUnits: adminProcedure
    .input(z.object({ adView: z.string().min(1) }))
    .query(({ input }) =>
      runHandler(async () => {
        const data = await fetchAdUnitOptionsForAdView(input.adView);
        return { ok: true as const, ...data };
      }),
    ),
  bannerTemplates: adminProcedure
    .input(
      z.object({
        adView: z.string().min(1),
        market: z.string().min(1).optional(),
      }),
    )
    .query(({ input }) =>
      runHandler(async () => {
        const data = await fetchTemplateOptionsForAdView(
          input.adView,
          input.market,
        );
        return { ok: true as const, ...data };
      }),
    ),
  bannerSettings: adminProcedure
    .input(
      z.object({
        formatId: z.string().min(1),
        type: z.string().min(1),
      }),
    )
    .query(({ input }) =>
      runHandler(async () => {
        const data = await fetchBannerSettingsForTemplate(
          input.formatId,
          input.type,
        );
        return { ok: true as const, ...data };
      }),
    ),
  createBanner: adminProcedure
    .input(bannerCreateSubmitSchema)
    .mutation(({ input }) =>
      runHandler(async () => {
        const result = await submitBannerCreate(input);
        return { ok: true as const, message: result.message };
      }),
    ),
  bannerAdvertisers: adminProcedure.query(() =>
    runHandler(async () => ({
      ok: true as const,
      options: loadAdvertiserOptionsFromData(),
    })),
  ),
});
