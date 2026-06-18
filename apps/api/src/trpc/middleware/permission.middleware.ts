import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc.js";

export function requirePermission(permission: string) {
  return middleware(({ ctx, next }) => {
    if (!ctx.user?.permissions.includes(permission)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next();
  });
}
