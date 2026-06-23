import type { TRPCError } from "@trpc/server";
import type { Request } from "express";
import { logger } from "../shared/logger/logger.js";
import type { Context } from "./context.js";

type TrpcOnErrorOptions = {
  error: TRPCError;
  path?: string;
  type: string;
  ctx?: Context;
  req: Request;
};

export function handleTrpcError({
  error,
  path,
  type,
  ctx,
  req,
}: TrpcOnErrorOptions): void {
  const requestId =
    ctx?.requestId ?? req?.headers["x-request-id"]?.toString() ?? undefined;

  logger.error("[trpc.request.failed]", {
    event: "trpc.request.failed",
    requestId,
    path,
    type,
    code: error.code,
    errorName: error.name,
    errorMessage: error.message,
  });
}
