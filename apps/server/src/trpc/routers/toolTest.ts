import { fetchPlatformBannerPage } from "../../services/yomediaPlatform.js";
import { adminProcedure, router, runHandler } from "../trpc.js";

export const toolTestRouter = router({
  platformBanner: adminProcedure.query(() =>
    runHandler(async () => {
      const page = await fetchPlatformBannerPage();
      return { ok: true as const, page };
    }),
  ),
});
