import { BackendRequestError, isBackendRequestError } from "./apiError";
import { trpcErrorToBackend } from "./trpc/errors";

function isTrpcClientError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "TRPCClientError"
  );
}

/**
 * Coerce any thrown value from `api.*`, `fetchJsonOrThrow`, or raw tRPC into `BackendRequestError`.
 */
export function normalizeApiError(err: unknown): BackendRequestError {
  if (isBackendRequestError(err)) return err;
  if (isTrpcClientError(err)) return trpcErrorToBackend(err);
  if (err instanceof Error) {
    if (err.name === "AdminOfflineError") {
      return new BackendRequestError(err.message, 0, { code: "NETWORK_ERROR" });
    }
    return new BackendRequestError(err.message, 500, { code: "INTERNAL", body: err });
  }
  return new BackendRequestError("An unexpected error occurred.", 500, {
    code: "INTERNAL",
  });
}
