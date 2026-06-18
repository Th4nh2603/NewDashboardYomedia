import { fetchJsonOrThrow } from "@/api/apiError";
import { serverApiOrigin } from "@/api/serverApiOrigin";

export type SftpScope = "demo" | "media";

export type SftpEntry = {
  name: string;
  type: string;
  size: number;
  modifyTime?: number;
};

type SftpClientOptions = {
  roleHeader?: string;
};

type ScopedRequestOptions = {
  scope?: SftpScope;
  headers?: Record<string, string>;
  /** Abort upload after this many ms (default 20 min for large video + server compress). */
  timeoutMs?: number;
};

const DEFAULT_BINARY_UPLOAD_TIMEOUT_MS = 20 * 60 * 1000;

function buildScopeQuery(scope?: SftpScope): string {
  return scope === "media" ? `&scope=${encodeURIComponent("media")}` : "";
}

function withRoleHeaders(
  base: Record<string, string> | undefined,
  roleHeader: string | undefined,
) {
  if (!roleHeader) return base;
  return {
    ...(base ?? {}),
    "x-user-role": roleHeader,
  };
}

export function createSftpClient(options?: SftpClientOptions) {
  const baseUrl = serverApiOrigin();
  const roleHeader = options?.roleHeader?.trim() || undefined;

  return {
    async list(path: string, options?: ScopedRequestOptions) {
      return fetchJsonOrThrow<{
        ok?: boolean;
        entries?: SftpEntry[];
        error?: string;
      }>(
        `${baseUrl}/api/sftp/list?path=${encodeURIComponent(path)}${buildScopeQuery(options?.scope)}`,
        {
          headers: withRoleHeaders(options?.headers, roleHeader),
        },
      );
    },
    async read(path: string, options?: ScopedRequestOptions) {
      return fetchJsonOrThrow<{
        ok?: boolean;
        content?: string;
        error?: string;
      }>(
        `${baseUrl}/api/sftp/read?path=${encodeURIComponent(path)}${buildScopeQuery(options?.scope)}`,
        {
          headers: withRoleHeaders(options?.headers, roleHeader),
        },
      );
    },
    async write(
      payload: { path: string; content: string; encoding?: "base64" },
      options?: ScopedRequestOptions,
    ) {
      return fetchJsonOrThrow<{
        ok?: boolean;
        error?: string;
        video?: {
          originalBytes?: number;
          compressedBytes?: number;
          videoCompressed?: boolean;
        };
      }>(`${baseUrl}/api/sftp/write`, {
        method: "POST",
        headers: withRoleHeaders(
          {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
          },
          roleHeader,
        ),
        body: JSON.stringify({
          ...payload,
          ...(options?.scope === "media" ? ({ scope: "media" as const } as const) : {}),
        }),
      });
    },
    async writeBinary(
      path: string,
      body: Blob | ArrayBuffer,
      options?: ScopedRequestOptions,
    ) {
      const timeoutMs =
        options?.timeoutMs ?? DEFAULT_BINARY_UPLOAD_TIMEOUT_MS;
      const controller = new AbortController();
      const timer =
        timeoutMs > 0
          ? setTimeout(() => controller.abort(), timeoutMs)
          : null;
      try {
        return await fetchJsonOrThrow<{
          ok?: boolean;
          error?: string;
          video?: {
            originalBytes?: number;
            compressedBytes?: number;
            videoCompressed?: boolean;
          };
        }>(
          `${baseUrl}/api/sftp/write-binary?path=${encodeURIComponent(path)}${buildScopeQuery(options?.scope)}`,
          {
            method: "POST",
            headers: withRoleHeaders(
              {
                "Content-Type": "application/octet-stream",
                ...(options?.headers ?? {}),
              },
              roleHeader,
            ),
            body,
            signal: controller.signal,
          },
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error(
            `Video upload timed out after ${Math.round(timeoutMs / 60000)} minute(s). The file may be large or server compression is still running — try a smaller clip or retry.`,
          );
        }
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    async remove(path: string, options?: ScopedRequestOptions) {
      return fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/sftp/delete`,
        {
          method: "POST",
          headers: withRoleHeaders(
            {
              "Content-Type": "application/json",
              ...(options?.headers ?? {}),
            },
            roleHeader,
          ),
          body: JSON.stringify({
            path,
            ...(options?.scope === "media" ? ({ scope: "media" as const } as const) : {}),
          }),
        },
      );
    },
    async rename(
      oldPath: string,
      newPath: string,
      options?: ScopedRequestOptions,
    ) {
      return fetchJsonOrThrow<{ ok?: boolean; error?: string }>(
        `${baseUrl}/api/sftp/rename`,
        {
          method: "POST",
          headers: withRoleHeaders(
            {
              "Content-Type": "application/json",
              ...(options?.headers ?? {}),
            },
            roleHeader,
          ),
          body: JSON.stringify({
            oldPath,
            newPath,
            ...(options?.scope === "media" ? ({ scope: "media" as const } as const) : {}),
          }),
        },
      );
    },
    async mkdir(path: string, options?: ScopedRequestOptions) {
      return fetchJsonOrThrow<{
        ok?: boolean;
        path?: string;
        error?: string;
      }>(`${baseUrl}/api/sftp/mkdir`, {
        method: "POST",
        headers: withRoleHeaders(
          {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
          },
          roleHeader,
        ),
        body: JSON.stringify({
          path,
          ...(options?.scope === "media" ? ({ scope: "media" as const } as const) : {}),
        }),
      });
    },
    async setupDemoToMedia(
      path: string,
      options?: {
        merge?: boolean;
        dryRun?: boolean;
        skipExistingDirectories?: boolean;
        overwriteDirectories?: string[];
      },
    ) {
      return fetchJsonOrThrow<{
        ok?: boolean;
        logicalPath?: string;
        dryRun?: boolean;
        merge?: boolean;
        skipExistingDirectories?: boolean;
        overwriteDirectories?: string[];
        existingDirectories?: string[];
        sourcePath?: string;
        targetPath?: string;
        sourceKind?: "directory" | "file" | "symlink";
        copiedFiles?: number;
        copiedDirectories?: number;
        createdTargetDirectory?: boolean;
        skippedDirectories?: string[];
        error?: string;
      }>(`${baseUrl}/api/sftp/setup-demo-media`, {
        method: "POST",
        headers: withRoleHeaders(
          {
            "Content-Type": "application/json",
          },
          roleHeader,
        ),
        body: JSON.stringify({
          path,
          ...(options?.merge === true ? { merge: true } : {}),
          ...(options?.dryRun === true ? { dryRun: true } : {}),
          ...(options?.skipExistingDirectories === true
            ? { skipExistingDirectories: true }
            : {}),
          ...(options?.overwriteDirectories?.length
            ? { overwriteDirectories: options.overwriteDirectories }
            : {}),
        }),
      });
    },
    async exists(path: string, scope: SftpScope = "demo") {
      return fetchJsonOrThrow<{
        ok?: boolean;
        exists?: boolean;
        kind?: string;
        error?: string;
      }>(
        `${baseUrl}/api/sftp/exists?scope=${encodeURIComponent(scope)}&path=${encodeURIComponent(path)}`,
        {
          headers: withRoleHeaders(undefined, roleHeader),
        },
      );
    },
  };
}
