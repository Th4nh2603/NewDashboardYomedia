import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc.js";

export const requireTenant = middleware(({ ctx, next }) => {
  if (!ctx.user?.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next();
});
