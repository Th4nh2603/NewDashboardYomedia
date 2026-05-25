import { z } from "zod";
import { HttpError } from "../../lib/http/errors.js";
import {
  listAdminAccounts,
  updateAdminAccount,
} from "../../services/admin.js";
import { adminProcedure, router, runHandler } from "../trpc.js";

export const adminRouter = router({
  accounts: adminProcedure.query(() =>
    runHandler(async () => {
      const result = await listAdminAccounts();
      if (!result.ok) {
        throw new HttpError(500, result.error);
      }
      return result;
    }),
  ),

  updateAccount: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        role: z.string().optional(),
        roleTitle: z.string().optional(),
        status: z.string().optional(),
        allowedBuildDemoBrands: z.unknown().optional(),
      }),
    )
    .mutation(({ input }) =>
      runHandler(async () => {
        const result = await updateAdminAccount(input.id, input);
        if (!result.ok) {
          const status =
            result.error === "No valid update fields" ? 400 : 500;
          throw new HttpError(status, result.error);
        }
        return result;
      }),
    ),
});
