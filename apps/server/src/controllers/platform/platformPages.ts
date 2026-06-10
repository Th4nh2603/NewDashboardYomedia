import { z } from "zod";
import { HttpError } from "../../lib/http/errors.js";
import { getUserRole } from "../../lib/auth/role.js";
import {
  fetchPlatformModulePage,
  type PlatformModuleKey,
} from "../../services/platform/yomediaPlatform.js";
import { protectedProcedure, router, runHandler } from "../../trpc/trpc.js";

const platformModuleSchema = z.enum([
  "banner",
  "flight",
  "placement",
  "campaign",
  "report",
]);

const LOAD_ALL_MODULES = new Set<PlatformModuleKey>(["placement"]);

export const platformPagesRouter = router({
  module: protectedProcedure
    .input(z.object({ module: platformModuleSchema }))
    .query(({ ctx, input }) =>
      runHandler(async () => {
        const role = getUserRole(ctx.req);
        if (!role) {
          throw new HttpError(403, "Missing or invalid role", {
            code: "FORBIDDEN",
          });
        }
        const page = await fetchPlatformModulePage(input.module, {
          loadAllRows: LOAD_ALL_MODULES.has(input.module),
        });
        return { ok: true as const, page };
      }),
    ),
});
