import type { ErrorRequestHandler } from "express";
import { isAppError } from "../shared/errors/app-error.js";
import { logger } from "../shared/logger/logger.js";

function statusFromError(error: unknown): number {
  if (isAppError(error)) return error.statusCode;
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status >= 400 && error.status < 600 ? error.status : 500;
  }
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
  }
  return 500;
}

function messageFromError(error: unknown, statusCode: number): string {
  if (isAppError(error) && error.expose) return error.message;
  if (statusCode === 400) return "Bad request";
  if (statusCode === 401) return "Unauthorized";
  if (statusCode === 403) return "Forbidden";
  if (statusCode === 404) return "Not found";
  if (statusCode === 409) return "Conflict";
  if (statusCode === 429) return "Too many requests";
  return "Internal server error";
}

function codeFromError(error: unknown): string | undefined {
  return isAppError(error) ? error.code : undefined;
}

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const statusCode = statusFromError(error);
  const requestId = req.headers["x-request-id"]?.toString();

  logger.error("[http.request.failed]", {
    event: "http.request.failed",
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Unknown error",
    code: codeFromError(error),
  });

  res.status(statusCode).json({
    error: messageFromError(error, statusCode),
    ...(codeFromError(error) ? { code: codeFromError(error) } : {}),
    ...(requestId ? { requestId } : {}),
  });
};
