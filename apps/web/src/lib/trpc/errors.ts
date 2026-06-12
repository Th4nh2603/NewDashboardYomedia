import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@yomedia/api";
import { BackendRequestError } from "../apiError";
import { ErrorCode } from "../errorCodes";

type AppTrpcClientError = TRPCClientError<AppRouter>;

function isAppTrpcClientError(err: unknown): err is AppTrpcClientError {
  return err instanceof TRPCClientError;
}

const TRPC_CODE_TO_STATUS: Record<string, number> = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
};

function trpcClientMessage(err: AppTrpcClientError): string {
  const zodError = (err.data as { zodError?: { fieldErrors?: Record<string, string[]> } } | undefined)
    ?.zodError;
  if (zodError?.fieldErrors) {
    const parts = Object.entries(zodError.fieldErrors).flatMap(([field, messages]) =>
      (messages ?? []).map((message) => `${field}: ${message}`),
    );
    if (parts.length > 0) return parts.join("; ");
  }
  return err.message;
}

export function trpcErrorToBackend(err: unknown): BackendRequestError {
  if (isAppTrpcClientError(err)) {
    const data = err.data as
      | { httpStatus?: number; code?: string }
      | undefined;
    const fromData =
      typeof data?.httpStatus === "number" ? data.httpStatus : undefined;
    const fromTrpcCode = TRPC_CODE_TO_STATUS[err.data?.code ?? ""] ?? undefined;
    const status = fromData ?? fromTrpcCode ?? 500;
    const code =
      typeof data?.code === "string" && data.code.length > 0
        ? data.code
        : status === 401
          ? ErrorCode.UNAUTHORIZED
          : status === 403
            ? ErrorCode.FORBIDDEN
            : status === 404
              ? ErrorCode.NOT_FOUND
              : status >= 500
                ? ErrorCode.INTERNAL
                : undefined;
    return new BackendRequestError(trpcClientMessage(err), status, {
      code,
      body: err.data,
    });
  }
  if (err instanceof Error) {
    return new BackendRequestError(err.message, 0, { code: ErrorCode.NETWORK_ERROR });
  }
  return new BackendRequestError("Request failed", 0, { code: ErrorCode.NETWORK_ERROR });
}
