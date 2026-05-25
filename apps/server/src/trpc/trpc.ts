import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context.js";
import { HttpError, isHttpError } from "../lib/http/errors.js";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const http = error.cause;
    if (isHttpError(http)) {
      return {
        ...shape,
        data: {
          ...shape.data,
          httpStatus: http.status,
          code: http.code ?? shape.data.code,
          details: http.details,
          ok: false,
        },
      };
    }
    return shape;
  },
});

function httpStatusToTrpcCode(
  status: number,
): TRPCError["code"] {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 422) return "UNPROCESSABLE_CONTENT";
  if (status === 429) return "TOO_MANY_REQUESTS";
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  return "INTERNAL_SERVER_ERROR";
}

export function throwHttp(err: HttpError): never {
  throw new TRPCError({
    code: httpStatusToTrpcCode(err.status),
    message: err.message,
    cause: err,
  });
}

export async function runHandler<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isHttpError(err)) throwHttp(err);
    throw err;
  }
}

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }
  ctx.req.verifiedAuth = ctx.auth;
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.auth || ctx.auth.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Forbidden: admin role required",
    });
  }
  return next({ ctx });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(requireAuth);
export const adminProcedure = protectedProcedure.use(requireAdmin);
