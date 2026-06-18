import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc.js";

export function requireBrandAccess(brandId: string) {
  return middleware(({ ctx, next }) => {
    if (!ctx.user?.allowedBrandIds.includes(brandId)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next();
  });
}
