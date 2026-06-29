import { z } from "zod";
import {
  mkdirSftpDirectory,
  writeSftpFile,
} from "../../../modules/sftp/sftp.service.js";
import type { RegisteredTool } from "../tool-registry.js";

const sftpWriteSchema = z.object({
  path: z.string().trim().min(1).max(500),
  scope: z.enum(["demo", "media"]).optional(),
  content: z.string().max(2_000_000).optional(),
  encoding: z.enum(["utf8", "base64"]).optional(),
});

const sftpMkdirSchema = z.object({
  path: z.string().trim().min(1).max(500),
  scope: z.enum(["demo", "media"]).optional(),
});

function checkDemoScope(input: { path: string }): string | null {
  return input.path.trim().startsWith("/script/demo")
    ? null
    : "SFTP path is outside the demo storage scope.";
}

function approvalOnly(
  name: "sftp.write" | "sftp.writeBinary" | "sftp.mkdir" | "sftp.setupDemoMedia",
  schema: z.ZodType<Record<string, unknown>>,
  reason: string,
  execute: (input: Record<string, unknown>) => Promise<unknown>,
): RegisteredTool<Record<string, unknown>> {
  return {
    name,
    description: `${name} is a backend-owned SFTP write workflow.`,
    inputSchema: schema,
    requiresApproval: true,
    approvalReason: reason,
    checkScope: (input) =>
      typeof input.path === "string"
        ? checkDemoScope({ path: input.path })
        : "SFTP path is required.",
    execute: async (input) => ({
      status: "success",
      summary: `${name} executed after approval.`,
      data: await execute(input),
    }),
  };
}

export function createSftpWriteTools(): RegisteredTool<Record<string, unknown>>[] {
  return [
    approvalOnly(
      "sftp.write",
      sftpWriteSchema,
      "Writing SFTP files can alter remote demo storage.",
      (input) =>
        writeSftpFile({
          path: String(input.path),
          content: String(input.content ?? ""),
          encoding: input.encoding === "base64" ? "base64" : "utf8",
          scope: input.scope === "media" ? "media" : "demo",
        }),
    ),
    approvalOnly(
      "sftp.writeBinary",
      sftpWriteSchema,
      "Uploading binary SFTP files can alter remote demo storage.",
      (input) =>
        writeSftpFile({
          path: String(input.path),
          content: String(input.content ?? ""),
          encoding: "base64",
          scope: input.scope === "media" ? "media" : "demo",
        }),
    ),
    approvalOnly(
      "sftp.mkdir",
      sftpMkdirSchema,
      "Creating SFTP folders changes remote demo storage.",
      (input) =>
        mkdirSftpDirectory({
          path: String(input.path),
          scope: input.scope === "media" ? "media" : "demo",
        }),
    ),
    approvalOnly(
      "sftp.setupDemoMedia",
      sftpMkdirSchema,
      "Setting up demo media can copy or overwrite remote assets.",
      (input) =>
        mkdirSftpDirectory({
          path: String(input.path),
          scope: "media",
        }),
    ),
  ];
}
