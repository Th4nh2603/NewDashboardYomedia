export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  expose?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly expose: boolean;
  override readonly cause?: unknown;

  constructor(message: string, statusCodeOrOptions: number | AppErrorOptions = 500) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);

    const options =
      typeof statusCodeOrOptions === "number"
        ? { statusCode: statusCodeOrOptions }
        : statusCodeOrOptions;

    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? codeFromStatus(this.statusCode);
    this.expose = options.expose ?? this.statusCode < 500;
    this.cause = options.cause;
  }
}

export function codeFromStatus(statusCode: number): string {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 422) return "UNPROCESSABLE_CONTENT";
  if (statusCode === 429) return "TOO_MANY_REQUESTS";
  return "INTERNAL_SERVER_ERROR";
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
