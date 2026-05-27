import { TRPCClientError } from "@trpc/client";
import { BackendRequestError } from "../apiError";

function trpcClientMessage(err: TRPCClientError): string {
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
    return new BackendRequestError(trpcClientMessage(err), status, {
      code: typeof data?.code === "string" ? data.code : undefined,
      body: err.data,
    });
  }
  if (err instanceof Error) {
    return new BackendRequestError(err.message, 0, { code: "NETWORK_ERROR" });
  }
  return new BackendRequestError("Request failed", 0);
}
