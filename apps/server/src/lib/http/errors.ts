import type { NextFunction, Request, RequestHandler, Response } from "express";

export type HttpErrorDetails = Record<string, unknown>;

/** Stable codes for clients and logs (see errorFormatter / fetch JSON `code`). */
export const ErrorCode = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  EXTERNAL_API: "EXTERNAL_API",
  SFTP: "SFTP",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: HttpErrorDetails;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: HttpErrorDetails },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}

function httpErrorFromMessage(message: string): HttpError | null {
  if (/API_KEY is missing/i.test(message)) {
    return new HttpError(503, message, { code: ErrorCode.EXTERNAL_API });
  }
  if (/Missing SFTP|SFTP_|on SFTP|SFTP credentials/i.test(message)) {
    return new HttpError(502, message, { code: ErrorCode.SFTP });
  }
  if (/Missing role|Forbidden|not allowed|Access denied/i.test(message)) {
    return new HttpError(403, message, { code: ErrorCode.FORBIDDEN });
  }
  if (/not found|does not exist/i.test(message)) {
    return new HttpError(404, message, { code: ErrorCode.NOT_FOUND });
  }
  return null;
}

export function badRequest(
  message: string,
  details?: HttpErrorDetails,
): HttpError {
  return new HttpError(400, message, {
    code: ErrorCode.VALIDATION,
    details,
  });
}

export function unauthorized(message: string): HttpError {
  return new HttpError(401, message, { code: ErrorCode.UNAUTHORIZED });
}

export function forbidden(message: string): HttpError {
  return new HttpError(403, message, { code: ErrorCode.FORBIDDEN });
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message, { code: ErrorCode.NOT_FOUND });
}

export function serviceUnavailable(
  message: string,
  options?: { code?: ErrorCodeValue; details?: HttpErrorDetails },
): HttpError {
  return new HttpError(503, message, {
    code: options?.code ?? ErrorCode.EXTERNAL_API,
    details: options?.details,
  });
}

export function errToHttpError(err: unknown): HttpError {
  if (isHttpError(err)) return err;
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr?.code === "ENOENT") {
    return new HttpError(404, "Not found", { code: ErrorCode.NOT_FOUND });
  }
  if (err instanceof Error) {
    const mapped = httpErrorFromMessage(err.message);
    if (mapped) return mapped;
    return new HttpError(500, err.message, { code: ErrorCode.INTERNAL });
  }
  return new HttpError(500, "Internal server error", { code: ErrorCode.INTERNAL });
}

function clientSafeMessage(http: HttpError): string {
  const prod = process.env.NODE_ENV === "production";
  if (prod && http.status >= 500) return "Internal server error";
  return http.message;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;
  const http = errToHttpError(err);
  const message = clientSafeMessage(http);
  const payload: Record<string, unknown> = {
    ok: false,
    error: message,
    ...(http.code ? { code: http.code } : {}),
    ...(http.details ?? {}),
  };
  res.status(http.status).json(payload);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    ok: false,
    error: `Not found: ${req.method} ${req.originalUrl || req.url}`,
    code: "NOT_FOUND",
  });
};

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
