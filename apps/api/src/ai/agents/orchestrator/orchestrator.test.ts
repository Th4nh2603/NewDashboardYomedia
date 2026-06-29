import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PlaceholderApprovalHandler } from "../../hitl/approval-handler.js";
import { transitionApproval } from "../../hitl/approval-state-machine.js";
import type { LlmProvider } from "../../providers/llm-provider.interface.js";
import type { AgentContext } from "../../runtime/agent-context.js";
import { createLoadSkillTool, SkillRegistry } from "../../skills/skill-registry.js";
import type { ToolRunRecord } from "../../tools/tool-registry.js";
import { ToolRegistry } from "../../tools/tool-registry.js";
import { ToolExecutor } from "../../tools/tool-executor.js";
import { createSftpDestructiveTools } from "../../tools/sftp/destructive-tools.js";
import { normalizeSftpPath } from "../../../modules/sftp/sftp-path-policy.js";
import { approvalRepository } from "../../../modules/approval/approval.repository.js";
import { approvalService } from "../../../modules/approval/approval.service.js";
import type { ApprovalRecord } from "../../../modules/approval/approval.types.js";
import { hashApprovalArgs } from "../../../modules/approval/approval-crypto.js";
import { auditLogService } from "../../../modules/audit-log/audit-log.service.js";
import type { AuthenticatedUser } from "../../../modules/auth/auth.types.js";
import { ToolAgentPlanner } from "../tools/tool-agent-planner.js";
import { ToolAgent } from "../tools/tool.agent.js";
import { Orchestrator, type OrchestratorPlanningAgent } from "./orchestrator.js";

class MockLlmProvider implements LlmProvider {
  prompts: string[] = [];

  async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    return "Final answer from sanitized tool result.";
  }
}

const mockContext: AgentContext = {
  userId: "user_1",
  tenantId: "tenant_1",
  permissions: ["chat:use"],
  allowedBrandIds: ["brand_1"],
  allowedKnowledgeBaseIds: ["kb_1"],
  allowedMcpTools: [],
  conversationId: "00000000-0000-4000-8000-000000000001",
  message: "build preview link for 2026/03/yomedia/300x250",
};

const mockUser: AuthenticatedUser = {
  id: "user_1",
  clerkUserId: "user_1",
  tenantId: "tenant_1",
  email: "user@example.test",
  name: "Test User",
  role: "admin",
  roleTitle: "Administrator",
  permissions: ["chat:use"],
  allowedRoutes: [],
  allowedBrandIds: ["brand_1"],
  allowedKnowledgeBaseIds: ["kb_1"],
  allowedMcpTools: ["*"],
  allowedToolCapabilities: ["*"],
};

function approvalRecord(
  patch: Partial<ApprovalRecord> & { toolName: string; args: Record<string, unknown> },
): ApprovalRecord {
  const now = new Date().toISOString();
  return {
    id: patch.id ?? crypto.randomUUID(),
    userId: patch.userId ?? mockUser.id,
    tenantId: patch.tenantId ?? mockUser.tenantId,
    brandId: patch.brandId,
    toolName: patch.toolName,
    riskLevel: patch.riskLevel ?? "high",
    status: patch.status ?? "pending",
    reason: patch.reason ?? "Test approval.",
    requestedArgsSummary: patch.requestedArgsSummary ?? patch.args,
    requestedArgsHash: patch.requestedArgsHash ?? hashApprovalArgs(patch.args),
    policySnapshot: patch.policySnapshot ?? {},
    executionArgs: patch.executionArgs ?? patch.args,
    executionArgsPersisted: patch.executionArgsPersisted ?? true,
    createdAt: patch.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now,
    expiresAt:
      patch.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    approvedBy: patch.approvedBy,
    approvedAt: patch.approvedAt,
    rejectedBy: patch.rejectedBy,
    rejectedAt: patch.rejectedAt,
    executedAt: patch.executedAt,
    executionResultStatus: patch.executionResultStatus,
    executionError: patch.executionError,
  };
}

async function testToolResultReturnsToLlm(): Promise<void> {
  const registry = new ToolRegistry();
  registry.register({
    name: "echo_tool",
    description: "Echo a sanitized value.",
    inputSchema: z.object({ value: z.string() }),
    requiresApproval: false,
    execute: async (input) => ({
      status: "success",
      summary: `Echoed ${input.value}.`,
      data: { value: input.value },
    }),
  });

  const llm = new MockLlmProvider();
  const agent: OrchestratorPlanningAgent = {
    name: "mock-agent",
    plan: async () => ({
      toolCall: {
        name: "echo_tool",
        input: { value: "ok" },
      },
    }),
  };

  const result = await new Orchestrator(
    registry,
    new PlaceholderApprovalHandler(),
    { maxSteps: 3, llmProvider: llm },
  ).run(agent, mockContext.message, mockContext);

  assert.equal(result.answer, "Final answer from sanitized tool result.");
  assert.equal(result.toolCalls.length, 1);
  assert.equal(llm.prompts.length, 1);
  assert.match(llm.prompts[0] ?? "", /Sanitized tool result/);
  assert.ok(
    result.steps.some(
      (step) =>
        typeof step === "object" &&
        step !== null &&
        "name" in step &&
        step.name === "tool.result",
    ),
  );
}

async function testToolPlannerRoutesVietnameseSftpListRequest(): Promise<void> {
  const planner = new ToolAgentPlanner(new ToolAgent());
  const plan = await planner.plan({
    userQuery: "hiển thị danh sách sftp tháng 3 năm 2026",
    context: {
      ...mockContext,
      message: "hiển thị danh sách sftp tháng 3 năm 2026",
    },
  });

  assert.deepEqual(plan.toolCall, {
    name: "sftp.list",
    input: { path: "/script/demo/2026/03", scope: "demo" },
  });
}

async function testApprovalGateStopsDangerousTool(): Promise<void> {
  const registry = new ToolRegistry();
  let executed = false;
  registry.register({
    name: "dangerous_tool",
    description: "Dangerous mutation.",
    inputSchema: z.object({ target: z.string() }),
    requiresApproval: true,
    approvalReason: "Dangerous mutation needs approval.",
    execute: async () => {
      executed = true;
      return { status: "success", summary: "Executed." };
    },
  });

  const agent: OrchestratorPlanningAgent = {
    name: "approval-agent",
    plan: async () => ({
      toolCall: {
        name: "dangerous_tool",
        input: { target: "remote-file" },
      },
    }),
  };

  const result = await new Orchestrator(
    registry,
    new PlaceholderApprovalHandler(),
    { maxSteps: 3 },
  ).run(agent, "delete remote-file", mockContext);

  assert.equal(executed, false);
  assert.equal(result.approvals.length, 1);
  assert.match(result.approvals[0]?.createdAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
  const firstToolCall = result.toolCalls[0] as ToolRunRecord | undefined;
  assert.equal(firstToolCall?.status, "approval_required");
}

async function testInvalidToolInputReturnsSafeError(): Promise<void> {
  const registry = new ToolRegistry();
  registry.register({
    name: "strict_tool",
    description: "Requires a string input.",
    inputSchema: z.object({ value: z.string().min(1) }),
    requiresApproval: false,
    execute: async () => ({
      status: "success",
      summary: "Should not execute.",
    }),
  });

  const result = await registry.call(
    { name: "strict_tool", input: { value: 42 } },
    mockContext,
    new PlaceholderApprovalHandler(),
  );

  assert.equal(result.result.status, "failed");
  assert.equal(result.result.summary, "Tool input validation failed.");
}

async function testUnknownToolDenied(): Promise<void> {
  const registry = new ToolRegistry();
  const result = await registry.call(
    { name: "missing_tool", input: {} },
    mockContext,
    new PlaceholderApprovalHandler(),
  );
  assert.equal(result.result.status, "failed");
  assert.match(result.result.summary, /not registered/);
}

async function testToolPermissionDenied(): Promise<void> {
  const registry = new ToolRegistry();
  registry.register({
    name: "permission_tool",
    description: "Needs a permission.",
    inputSchema: z.object({}),
    requiresApproval: false,
    requiredPermissions: ["tool:admin"],
    execute: async () => ({ status: "success", summary: "Should not execute." }),
  });
  const result = await registry.call(
    { name: "permission_tool", input: {} },
    mockContext,
    new PlaceholderApprovalHandler(),
  );
  assert.equal(result.result.status, "failed");
  assert.match(result.result.summary, /Missing required permission/);
}

async function testResultSanitizerRedactsSecrets(): Promise<void> {
  const registry = new ToolRegistry();
  registry.register({
    name: "secret_tool",
    description: "Returns sensitive data.",
    inputSchema: z.object({}),
    requiresApproval: false,
    execute: async () => ({
      status: "success",
      summary: "Returned data.",
      data: {
        password: "secret",
        nested: { apiKey: "key", safe: "ok" },
      },
    }),
  });
  const result = await registry.call(
    { name: "secret_tool", input: {} },
    mockContext,
    new PlaceholderApprovalHandler(),
  );
  assert.equal(JSON.stringify(result.result.data).includes("secret"), false);
  assert.equal(JSON.stringify(result.result.data).includes("key"), false);
  assert.equal(JSON.stringify(result.result.data).includes("ok"), true);
}

async function testPolicyGateBlocksUnsafePath(): Promise<void> {
  const registry = new ToolRegistry();
  registry.register({
    name: "path_tool",
    description: "Path tool.",
    inputSchema: z.object({ path: z.string() }),
    requiresApproval: false,
    execute: async () => ({
      status: "success",
      summary: "Should not execute.",
    }),
  });

  const result = await registry.call(
    { name: "path_tool", input: { path: "/script/demo/../secret" } },
    mockContext,
    new PlaceholderApprovalHandler(),
  );

  assert.equal(result.result.status, "failed");
  assert.match(result.result.summary, /unsafe path/);
}

async function testDestructiveSftpRequiresApproval(): Promise<void> {
  const registry = new ToolRegistry();
  for (const tool of createSftpDestructiveTools()) registry.register(tool);

  const result = await registry.call(
    { name: "sftp.delete", input: { path: "/script/demo/2026/demo" } },
    mockContext,
    new PlaceholderApprovalHandler(),
  );

  assert.equal(result.result.status, "approval_required");
  assert.equal(result.result.approval?.toolName, "sftp.delete");
}

async function testToolExecutorTimeoutMapping(): Promise<void> {
  const executor = new ToolExecutor({ timeoutMs: 1 });
  const result = await executor.execute(
    {
      name: "slow_tool",
      description: "Slow tool.",
      inputSchema: z.object({}),
      requiresApproval: false,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { status: "success", summary: "Late result." };
      },
    },
    {},
    mockContext,
  );

  assert.equal(result.status, "failed");
  assert.match(result.summary, /timed out/);
}

function testSftpPathNormalization(): void {
  assert.equal(normalizeSftpPath("script/demo//2026/../2026/06"), "/script/demo/2026/06");
}

function testApprovalStateMachine(): void {
  assert.equal(transitionApproval("pending", "approved"), "approved");
  assert.throws(() => transitionApproval("executed", "approved"));
}

async function testDurableApprovalLifecycleAndAudit(): Promise<void> {
  const handler = new PlaceholderApprovalHandler();
  const approval = await handler.requestApproval({
    toolName: "sftp.delete",
    reason: "Deleting SFTP assets is destructive.",
    input: { path: "/script/demo/2026/demo" },
    context: mockContext,
  });
  const stored = await approvalRepository.get(approval.id);
  assert.equal(stored?.status, "pending");

  const auditRows = await auditLogService.listByTenant(mockContext.tenantId);
  assert.ok(
    auditRows.some(
      (row) =>
        row.approvalId === approval.id && row.actionType === "approval.create",
    ),
  );

  const approved = await approvalService.approve(mockUser, approval.id);
  assert.equal(approved.approval.status, "approved");
  const rejectedApproval = await handler.requestApproval({
    toolName: "sftp.delete",
    reason: "Deleting SFTP assets is destructive.",
    input: { path: "/script/demo/2026/demo-2" },
    context: mockContext,
  });
  const rejected = await approvalService.reject(mockUser, rejectedApproval.id);
  assert.equal(rejected.approval.status, "rejected");
}

async function testExpiredApprovalCannotExecute(): Promise<void> {
  const record = await approvalRepository.create(
    approvalRecord({
      toolName: "build_preview_link",
      status: "approved",
      args: { remotePath: "2026/06/demo" },
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }),
  );
  await assert.rejects(
    () => approvalService.execute(mockUser, { approvalId: record.id }),
    /Expired approvals cannot be executed/,
  );
}

async function testExecutedApprovalCannotReplay(): Promise<void> {
  const record = await approvalRepository.create(
    approvalRecord({
      toolName: "build_preview_link",
      status: "executed",
      args: { remotePath: "2026/06/demo" },
    }),
  );
  await assert.rejects(
    () => approvalService.execute(mockUser, { approvalId: record.id }),
    /Only approved pending execution requests can run/,
  );
}

async function testApprovalExecutionRevalidatesPolicy(): Promise<void> {
  const record = await approvalRepository.create(
    approvalRecord({
      toolName: "sftp.delete",
      status: "approved",
      args: { path: "/script/demo/../secret" },
    }),
  );
  const result = await approvalService.execute(mockUser, { approvalId: record.id });
  assert.equal(result.result.status, "failed");
  assert.match(result.result.summary, /unsafe path/);
}

async function testTamperedApprovalArgsCannotExecute(): Promise<void> {
  const record = await approvalRepository.create(
    approvalRecord({
      toolName: "build_preview_link",
      status: "approved",
      args: { remotePath: "2026/06/demo" },
      executionArgsPersisted: false,
      executionArgs: undefined,
    }),
  );
  await assert.rejects(
    () =>
      approvalService.execute(mockUser, {
        approvalId: record.id,
        args: { remotePath: "2026/06/other-demo" },
      }),
    /Approval arguments do not match/,
  );
}

async function testApprovedExecutionWritesAudit(): Promise<void> {
  const record = await approvalRepository.create(
    approvalRecord({
      toolName: "build_preview_link",
      status: "approved",
      args: { remotePath: "2026/06/demo" },
    }),
  );
  const result = await approvalService.execute(mockUser, { approvalId: record.id });
  assert.equal(result.result.status, "success");
  const auditRows = await auditLogService.listByTenant(mockUser.tenantId);
  assert.ok(
    auditRows.some(
      (row) =>
        row.approvalId === record.id && row.actionType === "approval.execute",
    ),
  );
}

async function testSkillRegistryPreloadAndLoadSkillSafety(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "skill-registry-"));
  try {
    const skillDir = join(root, "demo-skill");
    await mkdir(skillDir);
    await writeFile(
      join(skillDir, "SKILL.md"),
      [
        "name: demo-skill",
        "description: Demo skill.",
        "",
        "# Demo",
        "Use this body only when loaded.",
      ].join("\n"),
      "utf8",
    );

    const skills = new SkillRegistry(root);
    const catalog = await skills.preloadCatalog();
    assert.deepEqual(catalog.map((skill) => skill.name), ["demo-skill"]);
    assert.equal("body" in catalog[0]!, false);

    const registry = new ToolRegistry();
    registry.register(createLoadSkillTool(skills));
    const loaded = await registry.call(
      { name: "load_skill", input: { name: "demo-skill" } },
      mockContext,
      new PlaceholderApprovalHandler(),
    );
    assert.equal(loaded.result.status, "success");
    assert.match(JSON.stringify(loaded.result.data), /Use this body only when loaded/);

    const rejected = await registry.call(
      { name: "load_skill", input: { name: "../demo-skill" } },
      mockContext,
      new PlaceholderApprovalHandler(),
    );
    assert.equal(rejected.result.status, "failed");
    assert.equal(rejected.result.summary, "Tool input validation failed.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await testToolResultReturnsToLlm();
  await testToolPlannerRoutesVietnameseSftpListRequest();
  await testApprovalGateStopsDangerousTool();
  await testInvalidToolInputReturnsSafeError();
  await testUnknownToolDenied();
  await testToolPermissionDenied();
  await testResultSanitizerRedactsSecrets();
  await testPolicyGateBlocksUnsafePath();
  await testDestructiveSftpRequiresApproval();
  await testToolExecutorTimeoutMapping();
  testSftpPathNormalization();
  testApprovalStateMachine();
  await testDurableApprovalLifecycleAndAudit();
  await testExpiredApprovalCannotExecute();
  await testExecutedApprovalCannotReplay();
  await testApprovalExecutionRevalidatesPolicy();
  await testTamperedApprovalArgsCannotExecute();
  await testApprovedExecutionWritesAudit();
  await testSkillRegistryPreloadAndLoadSkillSafety();
  console.log("orchestrator tests passed");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
