import type { NextFunction, Request, RequestHandler, Response } from "express";

export type HttpErrorDetails = Record<string, unknown>;

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

export function errToHttpError(err: unknown): HttpError {
  if (isHttpError(err)) return err;
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr?.code === "ENOENT") {
    return new HttpError(404, "Not found", { code: "ENOENT" });
  }
  if (err instanceof Error) {
    return new HttpError(500, err.message, { code: "INTERNAL" });
  }
  return new HttpError(500, "Internal server error", { code: "INTERNAL" });
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
