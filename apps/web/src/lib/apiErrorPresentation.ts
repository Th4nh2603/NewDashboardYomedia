import type { ErrorSeverity } from "../contexts/ErrorContext";
import type { BackendRequestError } from "./apiError";
import { ErrorCode } from "./errorCodes";
import { normalizeApiError } from "./normalizeApiError";

export type ApiErrorPresentation = {
  message: string;
  severity: ErrorSeverity;
  title: string;
};

export function getApiErrorPresentation(
  error: BackendRequestError,
  context: string,
): ApiErrorPresentation {
  let message = error.message || "An unexpected error occurred.";
  let severity: ErrorSeverity = "error";
  let title = `${context} failed`;

  const { status, code } = error;

  if (status === 0 || code === ErrorCode.NETWORK_ERROR) {
    message =
      message.trim() ||
      "Cannot reach the API server. Check that the backend is running.";
    title = "Connection error";
    severity = "warning";
    return { message, severity, title };
  }

  if (status === 429 || code === "TOO_MANY_REQUESTS") {
    return {
      message: "Too many requests. Please wait a moment before trying again.",
      severity: "warning",
      title: "Rate limit",
    };
  }

  if (status === 401 || code === ErrorCode.UNAUTHORIZED) {
    return {
      message: message || "Please sign in again.",
      severity: "warning",
      title: "Session expired",
    };
  }

  if (status === 403 || code === ErrorCode.FORBIDDEN) {
    return {
      message: message || "You do not have permission for this action.",
      severity: "warning",
      title: "Access denied",
    };
  }

  if (
    status === 404 ||
    code === ErrorCode.NOT_FOUND ||
    code === "ENOENT" ||
    code === "NOT_FOUND"
  ) {
    return { message, severity: "warning", title: "Not found" };
  }

  if (status === 409 || code === ErrorCode.CONFLICT) {
    return { message, severity: "warning", title: "Conflict" };
  }

  if (
    status === 400 ||
    status === 422 ||
    code === ErrorCode.VALIDATION ||
    code === "BAD_REQUEST"
  ) {
    return { message, severity: "warning", title: "Invalid request" };
  }

  if (status === 502 || code === ErrorCode.SFTP) {
    return {
      message,
      severity: "error",
      title: "SFTP error",
    };
  }

  if (status === 503 || code === ErrorCode.EXTERNAL_API) {
    return {
      message:
        message ||
        "An external service (AI or platform) is unavailable. Try again later.",
      severity: "warning",
      title: "Service unavailable",
    };
  }

  if (status >= 500 || code === ErrorCode.INTERNAL) {
    return { message, severity: "error", title: "Server error" };
  }

  return { message, severity, title };
}

/** User-facing message for inline UI (chat bubbles, form hints). */
export function getApiErrorMessage(err: unknown, context: string): string {
  return getApiErrorPresentation(normalizeApiError(err), context).message;
}
