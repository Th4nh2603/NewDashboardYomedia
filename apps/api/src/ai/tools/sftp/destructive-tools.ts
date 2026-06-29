import { z } from "zod";
import {
  deleteSftpPath,
  overwriteSftpFile,
  renameSftpPath,
} from "../../../modules/sftp/sftp.service.js";
import type { RegisteredTool } from "../tool-registry.js";

const sftpDeleteSchema = z.object({
  path: z.string().trim().min(1).max(500),
  scope: z.enum(["demo", "media"]).optional(),
});

const sftpRenameSchema = z.object({
  oldPath: z.string().trim().min(1).max(500),
  newPath: z.string().trim().min(1).max(500),
  scope: z.enum(["demo", "media"]).optional(),
});

function checkPath(path: string): string | null {
  return path.trim().startsWith("/script/demo")
    ? null
    : "SFTP path is outside the demo storage scope.";
}

export function createSftpDestructiveTools(): RegisteredTool<Record<string, unknown>>[] {
  return [
    {
      name: "sftp.delete",
      description: "Delete files or folders from remote demo storage.",
      inputSchema: sftpDeleteSchema,
      requiresApproval: true,
      approvalReason: "Deleting SFTP assets is destructive and requires approval.",
      checkScope: (input) =>
        typeof input.path === "string" ? checkPath(input.path) : "SFTP path is required.",
      execute: async (input) => ({
        status: "success",
        summary: "sftp.delete executed after approval.",
        data: await deleteSftpPath({
          path: String(input.path),
          scope: input.scope === "media" ? "media" : "demo",
        }),
      }),
    },
    {
      name: "sftp.rename",
      description: "Rename files or folders in remote demo storage.",
      inputSchema: sftpRenameSchema,
      requiresApproval: true,
      approvalReason: "Renaming SFTP assets can break demos and requires approval.",
      checkScope: (input) => {
        if (typeof input.oldPath !== "string" || typeof input.newPath !== "string") {
          return "SFTP oldPath and newPath are required.";
        }
        return checkPath(input.oldPath) ?? checkPath(input.newPath);
      },
      execute: async (input) => ({
        status: "success",
        summary: "sftp.rename executed after approval.",
        data: await renameSftpPath({
          oldPath: String(input.oldPath),
          newPath: String(input.newPath),
          scope: input.scope === "media" ? "media" : "demo",
        }),
      }),
    },
    {
      name: "sftp.overwrite",
      description: "Overwrite an existing remote demo storage file.",
      inputSchema: sftpDeleteSchema.extend({
        content: z.string().max(2_000_000).optional(),
      }),
      requiresApproval: true,
      approvalReason: "Overwriting SFTP assets is destructive and requires approval.",
      checkScope: (input) =>
        typeof input.path === "string" ? checkPath(input.path) : "SFTP path is required.",
      execute: async (input) => ({
        status: "success",
        summary: "sftp.overwrite executed after approval.",
        data: await overwriteSftpFile({
          path: String(input.path),
          content: String(input.content ?? ""),
          encoding: "utf8",
          scope: input.scope === "media" ? "media" : "demo",
        }),
      }),
    },
  ];
}
