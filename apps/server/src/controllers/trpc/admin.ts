import { z } from "zod";
import { HttpError } from "../../lib/http/errors.js";
import { migrateLegacyRoleKey } from "../../lib/auth/accounts.js";
import { listAdminAccounts, updateAdminAccount } from "../../services/admin.js";
import { adminProcedure, router, runHandler } from "../../trpc/trpc.js";

const updateAccountInputSchema = z
  .object({
    id: z.string().trim().min(1),
    role: z
      .string()
      .optional()
      .transform((value) =>
        value === undefined ? undefined : migrateLegacyRoleKey(value),
      ),
    roleTitle: z.string().nullish(),
    status: z.string().optional(),
    allowedBuildDemoBrands: z.unknown().nullish(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      typeof data.roleTitle === "string" ||
      data.status !== undefined ||
      data.allowedBuildDemoBrands !== undefined,
    { message: "At least one field to update is required" },
  );

function buildUpdateAccountPatch(
  input: z.infer<typeof updateAccountInputSchema>,
) {
  const patch: {
    role?: string;
    roleTitle?: string;
    status?: string;
    allowedBuildDemoBrands?: unknown;
  } = {};
  if (input.role !== undefined) patch.role = input.role;
  if (typeof input.roleTitle === "string") {
    patch.roleTitle = input.roleTitle;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.allowedBuildDemoBrands !== undefined) {
    patch.allowedBuildDemoBrands = input.allowedBuildDemoBrands;
  }
  return patch;
}

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
    .input(updateAccountInputSchema)
    .mutation(({ input }) =>
      runHandler(async () => {
        console.log("input5656", input);
        const patch = buildUpdateAccountPatch(input);
        const result = await updateAdminAccount(input.id, patch);
        if (!result.ok) {
          const status = result.error === "No valid update fields" ? 400 : 500;
          throw new HttpError(status, result.error);
        }
        return result;
      }),
    ),
});
