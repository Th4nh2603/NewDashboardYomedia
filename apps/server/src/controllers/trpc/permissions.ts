import { z } from "zod";
import {
  getPermissionsSnapshot,
  updateRolePermission,
} from "../../services/permissions.js";
import {
  adminProcedure,
  publicProcedure,
  router,
  runHandler,
} from "../../trpc/trpc.js";
import { HttpError } from "../../lib/http/errors.js";
import { normalizeAccountText } from "../../lib/auth/accounts.js";

const rolePermissionPayloadSchema = z.object({
  manageDemo: z
    .object({
      canUseFileActionButtons: z.unknown().optional(),
      canSwitchSftpHost: z.unknown().optional(),
      canSetupMediaSftp: z.unknown().optional(),
      canSftpUploadBinary: z.unknown().optional(),
      canSftpWriteFile: z.unknown().optional(),
      canSftpDelete: z.unknown().optional(),
      canSftpRename: z.unknown().optional(),
      canSftpMkdir: z.unknown().optional(),
      allowedBuildDemoBrands: z.unknown().optional(),
    })
    .optional(),
  routeAccess: z.object({ allowedRoutes: z.unknown().optional() }).optional(),
  creativeShowcase: z
    .object({ canDownload: z.unknown().optional() })
    .optional(),
});

export const permissionsRouter = router({
  get: publicProcedure.query(() => ({
    ok: true as const,
    ...getPermissionsSnapshot(),
  })),

  adminGet: adminProcedure.query(() => ({
    ok: true as const,
    ...getPermissionsSnapshot(),
  })),

  adminUpdate: adminProcedure
    .input(
      z.object({
        role: z.string().min(1),
        payload: rolePermissionPayloadSchema,
      }),
    )
    .mutation(({ input }) =>
      runHandler(async () => {
        console.log("input", input);
        const role = normalizeAccountText(input.role);
        if (!role) {
          throw new HttpError(400, "Missing role");
        }
        const updated = updateRolePermission(role, input.payload);
        return { ok: true as const, ...updated };
      }),
    ),
});
