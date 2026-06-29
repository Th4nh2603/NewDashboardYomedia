import { z } from "zod";
import {
  listSftpEntries,
  sftpExists,
} from "../../../modules/sftp/sftp.service.js";
import type { RegisteredTool } from "../tool-registry.js";

const sftpPathInputSchema = z.object({
  path: z.string().trim().min(1).max(500),
  scope: z.enum(["demo", "media"]).optional(),
});

function checkDemoScope(input: { path: string }): string | null {
  return input.path.trim().startsWith("/script/demo")
    ? null
    : "SFTP path is outside the demo storage scope.";
}

export function createSftpListTool(): RegisteredTool<{
  path: string;
  scope?: "demo" | "media";
}> {
  return {
    name: "sftp.list",
    description: "List files and folders in remote demo storage.",
    inputSchema: sftpPathInputSchema,
    requiresApproval: false,
    checkScope: checkDemoScope,
    execute: async (input) => ({
      status: "success",
      summary: "Listed SFTP folder entries.",
      data: await listSftpEntries(input),
    }),
  };
}

export function createSftpExistsTool(): RegisteredTool<{
  path: string;
  scope?: "demo" | "media";
}> {
  return {
    name: "sftp.exists",
    description: "Check whether a remote demo storage path exists.",
    inputSchema: sftpPathInputSchema,
    requiresApproval: false,
    checkScope: checkDemoScope,
    execute: async (input) => ({
      status: "success",
      summary: "Checked SFTP path existence.",
      data: await sftpExists(input),
    }),
  };
}

export function createSftpReadPlaceholderTool(): RegisteredTool<{
  path: string;
  scope?: "demo" | "media";
}> {
  return {
    name: "sftp.read",
    description: "Read a text file from remote demo storage.",
    inputSchema: sftpPathInputSchema,
    requiresApproval: false,
    checkScope: checkDemoScope,
    execute: async (input) => ({
      status: "skipped",
      summary: "SFTP read is registered but not executed by chat yet.",
      data: { path: input.path, scope: input.scope ?? "demo" },
    }),
  };
}

export function createSftpDownloadPlaceholderTool(): RegisteredTool<{
  path: string;
  scope?: "demo" | "media";
}> {
  return {
    name: "sftp.download",
    description: "Prepare a backend-owned SFTP file download.",
    inputSchema: sftpPathInputSchema,
    requiresApproval: false,
    checkScope: checkDemoScope,
    execute: async (input) => ({
      status: "skipped",
      summary: "SFTP download is registered but not executed by chat yet.",
      data: { path: input.path, scope: input.scope ?? "demo" },
    }),
  };
}
