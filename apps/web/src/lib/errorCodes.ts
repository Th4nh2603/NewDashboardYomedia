/** Mirrors server `ErrorCode` in `apps/server/src/lib/http/errors.ts`. */
export const ErrorCode = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  EXTERNAL_API: "EXTERNAL_API",
  SFTP: "SFTP",
  INTERNAL: "INTERNAL",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_JSON: "INVALID_JSON",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
