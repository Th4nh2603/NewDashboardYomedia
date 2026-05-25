import { withApiAuthHeaders } from "./apiAuth";

/** Normalized failure from this app's Express API (`{ ok: false, error, code? }`) or fetch. */

export class BackendRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    status: number,
    options?: { code?: string; body?: unknown },
  ) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
    this.code = options?.code;
    this.body = options?.body;
  }
}

export function isBackendRequestError(err: unknown): err is BackendRequestError {
  return err instanceof BackendRequestError;
}

type BackendJsonErr = {
  ok?: boolean;
  error?: unknown;
  code?: unknown;
};

function isBackendJsonErr(value: unknown): value is BackendJsonErr {
  return typeof value === "object" && value !== null;
}

function messageFromBackendJson(data: BackendJsonErr): string {
  const error = data.error;
  return typeof error === "string" && error.trim() ? error : "Request failed";
}

function codeFromBackendJson(data: BackendJsonErr): string | undefined {
  return typeof data.code === "string" ? data.code : undefined;
}

async function parseErrorBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  return text || undefined;
}

function fallbackMessageFromBody(body: unknown, status: number): string {
  return typeof body === "string" && body.trim() ? body.trim() : `HTTP ${status}`;
}

/**
 * Call after `fetch` when `!response.ok`. Parses JSON body when possible.
 */
export async function backendErrorFromResponse(
  res: Response,
): Promise<BackendRequestError> {
  let body: unknown = undefined;

  try {
    body = await parseErrorBody(res);
  } catch {
    body = undefined;
  }

  if (isBackendJsonErr(body) && "error" in body) {
    const data = body;
    return new BackendRequestError(messageFromBackendJson(data), res.status, {
      code: codeFromBackendJson(data),
      body,
    });
  }

  return new BackendRequestError(fallbackMessageFromBody(body, res.status), res.status, {
    body,
  });
}

function isNoContentResponse(res: Response): boolean {
  return res.status === 204 || res.status === 205;
}

/**
 * Standardized API JSON caller used across the web app.
 * - Converts HTTP errors to `BackendRequestError`
 * - Converts network failures to `BackendRequestError` with code `NETWORK_ERROR`
 */
export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const headers = await withApiAuthHeaders(init?.headers);
  const requestInit: RequestInit = { ...init, headers };

  let res: Response;
  try {
    res = await fetch(input, requestInit);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Network request failed";
    throw new BackendRequestError(message, 0, {
      code: "NETWORK_ERROR",
      body: error,
    });
  }

  if (!res.ok) {
    throw await backendErrorFromResponse(res);
  }

  if (isNoContentResponse(res)) {
    return {} as T;
  }

  try {
    return (await res.json()) as T;
  } catch (error) {
    throw new BackendRequestError("Invalid JSON response", res.status, {
      code: "INVALID_JSON",
      body: error,
    });
  }
}
