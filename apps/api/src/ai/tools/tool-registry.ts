import { z } from "zod";
import type { AgentContext } from "../runtime/agent-context.js";
import type {
  ApprovalHandler,
  ApprovalRequiredDto,
} from "../hitl/approval-handler.js";
import { ToolGateway } from "./tool-gateway.js";
import {
  createSftpDownloadPlaceholderTool,
  createSftpExistsTool,
  createSftpListTool,
  createSftpReadPlaceholderTool,
} from "./sftp/read-tools.js";
import { createSftpWriteTools } from "./sftp/write-tools.js";
import { createSftpDestructiveTools } from "./sftp/destructive-tools.js";

export type ToolExecutionStatus =
  | "success"
  | "failed"
  | "skipped"
  | "approval_required";

export interface ToolExecutionResult {
  status: ToolExecutionStatus;
  summary: string;
  data?: unknown;
  approval?: ApprovalRequiredDto;
}

export interface ToolRunRecord {
  serverName: "backend";
  toolName: string;
  status: ToolExecutionStatus;
  durationMs: number;
  requiresApproval: boolean;
  approvalId?: string;
  summary: string;
}

export interface RegisteredTool<TInput extends Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  requiresApproval: boolean;
  approvalReason?: string;
  requiredPermissions?: string[];
  checkScope?: (input: TInput, context: AgentContext) => string | null;
  sanitizeResult?: (result: ToolExecutionResult) => ToolExecutionResult;
  execute(input: TInput, context: AgentContext): Promise<ToolExecutionResult>;
}

export interface ToolCallRequest {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  result: ToolExecutionResult;
  record: ToolRunRecord;
}

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool<Record<string, unknown>>>();

  register<TInput extends Record<string, unknown>>(
    tool: RegisteredTool<TInput>,
  ): void {
    this.tools.set(
      tool.name,
      tool as RegisteredTool<Record<string, unknown>>,
    );
  }

  getCatalog(): Array<{ name: string; description: string; requiresApproval: boolean }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      requiresApproval: tool.requiresApproval,
    }));
  }

  get(name: string): RegisteredTool<Record<string, unknown>> | undefined {
    return this.tools.get(name);
  }

  async call(
    request: ToolCallRequest,
    context: AgentContext,
    approvalHandler: ApprovalHandler,
  ): Promise<ToolCallResult> {
    return new ToolGateway(this).call(request, context, approvalHandler);
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(createBuildPreviewLinkTool());
  registry.register(createSftpExistsCheckTool());
  registry.register(createSftpListTool());
  registry.register(createSftpExistsTool());
  registry.register(createSftpReadPlaceholderTool());
  registry.register(createSftpDownloadPlaceholderTool());
  for (const tool of createSftpWriteTools()) registry.register(tool);
  for (const tool of createSftpDestructiveTools()) registry.register(tool);
  registry.register(createApprovalOnlyTool("delete_uploaded_demo"));
  registry.register(createApprovalOnlyTool("build_demo_convert_upload"));
  registry.register(createApprovalOnlyTool("banner_setup"));
  registry.register(createApprovalOnlyTool("send_message"));
  registry.register(createApprovalOnlyTool("sql_mutation"));
  return registry;
}

const pathInputSchema = z.object({
  remotePath: z.string().min(1).max(1_000),
});

function normalizeRemotePath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function createBuildPreviewLinkTool(): RegisteredTool<{ remotePath: string }> {
  return {
    name: "build_preview_link",
    description: "Build a demo.yomedia.vn preview link from a demo remote path.",
    inputSchema: pathInputSchema,
    requiresApproval: false,
    execute: async (input) => {
      const remotePath = normalizeRemotePath(input.remotePath);
      const bannerPath = /\.html?$/i.test(remotePath)
        ? remotePath
        : `${remotePath.replace(/\/+$/, "")}/index.html`;
      const url =
        "https://demo.yomedia.vn/yomedia/app/template/site/idmb/index.html" +
        `?f=${encodeURIComponent("inpage-mb")}` +
        `&b=${encodeURIComponent(bannerPath)}` +
        "&l=lt&c=demo";

      return {
        status: "success",
        summary: "Built a preview link from the provided remote path.",
        data: { url, remotePath: bannerPath },
      };
    },
  };
}

function createSftpExistsCheckTool(): RegisteredTool<{ remotePath: string }> {
  return {
    name: "sftp_exists_check",
    description: "Check whether a remote SFTP path exists.",
    inputSchema: pathInputSchema,
    requiresApproval: false,
    execute: async (input) => ({
      status: "skipped",
      summary:
        "SFTP exists check needs a backend SFTP provider; no provider is configured in chat orchestration yet.",
      data: { remotePath: input.remotePath },
    }),
  };
}

function createApprovalOnlyTool(
  name:
    | "delete_uploaded_demo"
    | "build_demo_convert_upload"
    | "banner_setup"
    | "send_message"
    | "sql_mutation",
): RegisteredTool<Record<string, unknown>> {
  return {
    name,
    description: `Prepare ${name} workflow and request human approval before execution.`,
    inputSchema: z.record(z.unknown()),
    requiresApproval: true,
    approvalReason:
      name === "delete_uploaded_demo"
        ? "Deleting uploaded demo assets is destructive."
        : name === "build_demo_convert_upload"
          ? "Building and uploading demo assets can overwrite remote files."
          : name === "banner_setup"
            ? "Creating or updating banner setup can affect external campaign data."
            : name === "sql_mutation"
              ? "SQL mutations require policy checks, audit logging, and human approval."
              : "Sending messages to external systems requires human approval.",
    execute: async () => ({
      status: "skipped",
      summary: "Approval-only tools are not executed without a HITL approval.",
    }),
  };
}
