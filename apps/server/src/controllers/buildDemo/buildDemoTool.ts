import type { Request } from "express";
import type {
  ChatAttachmentMeta,
  ChatProvider,
  MemoryMessage,
} from "../../lib/ai/core/types.js";
import {
  clearBuildDemoAttachments,
  mergeBuildDemoAttachments,
} from "../../lib/ai/memory/shortMemory.js";
import {
  invokeBuildDemoAgent,
  resolveBuildDemoToolInput,
} from "../../lib/ai/tools/buildDemo/buildDemoAgent.js";
import type { ActionTool } from "../../lib/ai/tools/types.js";
import { buildDemoInputSchema } from "../../shared/schemas/buildDemo.schema.js";
import {
  assertBuildDemoBrandPolicy,
  assertBuildDemoSftpAllowed,
} from "../../services/auth/authPolicy.service.js";
import {
  executeBuildDemo,
  formatBuildDemoChatAnswer,
} from "../../services/buildDemo/buildDemo.service.js";

const BUILD_DEMO_SUCCESS_PREFIX = "Build Demo thành công";

export type BuildDemoToolRunResult = {
  answer: string;
  executed: boolean;
};

export async function runBuildDemoTool(input: {
  question: string;
  provider: ChatProvider;
  history: MemoryMessage[];
  attachments: ChatAttachmentMeta[];
  allowedBrands: string[] | null;
  memoryKey: string;
  actionTool: Extract<ActionTool, "upload_sftp_demo" | "compress_demo_assets">;
  req: Request;
}): Promise<BuildDemoToolRunResult> {
  assertBuildDemoSftpAllowed(input.req);

  const attachments = mergeBuildDemoAttachments(
    input.memoryKey,
    input.attachments,
  );

  let agentResult;
  try {
    agentResult = await invokeBuildDemoAgent({
      provider: input.provider,
      question: input.question,
      history: input.history,
      allowedBrands: input.allowedBrands,
      attachments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent unavailable";
    return { answer: `Không gọi được agent Build Demo: ${message}`, executed: false };
  }

  const rawToolInput =
    agentResult.kind === "tool_call"
      ? agentResult.input
      : resolveBuildDemoToolInput({
          question: input.question,
          history: input.history,
          allowedBrands: input.allowedBrands,
          attachments,
        });

  if (!rawToolInput) {
    const text =
      agentResult.kind === "message"
        ? agentResult.text
        : "Chưa đủ thông tin Build Demo. Cần: brand, format (HTML hoặc Video), file đính kèm.";
    return { answer: text, executed: false };
  }

  const toolInput = buildDemoInputSchema.parse(rawToolInput);
  assertBuildDemoBrandPolicy(toolInput.brandId, input.allowedBrands);

  const result = await executeBuildDemo({
    toolInput,
    attachments,
    allowedBrands: input.allowedBrands,
    intent:
      input.actionTool === "upload_sftp_demo"
        ? "upload_sftp"
        : "compress_demo_assets",
  });

  const answer = formatBuildDemoChatAnswer(result);
  if (answer.startsWith(BUILD_DEMO_SUCCESS_PREFIX)) {
    clearBuildDemoAttachments(input.memoryKey);
  }

  return { answer, executed: true };
}
