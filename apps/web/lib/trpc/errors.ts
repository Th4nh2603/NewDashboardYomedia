import { TRPCClientError } from "@trpc/client";
import { BackendRequestError } from "../apiError";

export function trpcErrorToBackend(err: unknown): BackendRequestError {
  if (err instanceof TRPCClientError) {
    const data = err.data as
      | { httpStatus?: number; code?: string }
      | undefined;
    const status =
      typeof data?.httpStatus === "number"
        ? data.httpStatus
        : err.message.includes("UNAUTHORIZED")
          ? 401
          : 500;
    return new BackendRequestError(err.message, status, {
      code: typeof data?.code === "string" ? data.code : undefined,
      body: err.data,
    });
  }
  if (err instanceof Error) {
    return new BackendRequestError(err.message, 0, { code: "NETWORK_ERROR" });
  }
  return new BackendRequestError("Request failed", 0);
}
