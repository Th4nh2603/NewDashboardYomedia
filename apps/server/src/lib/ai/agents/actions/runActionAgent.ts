import type { AgentContext, AgentResult } from "../../core/types.js";
import { runBuildDemoTool } from "../../../../controllers/ai/buildDemoTool.js";
import { executeTool, resolveActionTool } from "../../tools/index.js";
import { hasBuildDemoAttachments } from "../../memory/shortMemory.js";
import { findAccountByEmail } from "../../../auth/accounts.js";
import { resolveAllowedBuildDemoBrands } from "../../../../services/permissions.js";

export async function runActionAgent(ctx: AgentContext): Promise<AgentResult> {
  const startedAt = Date.now();
  const tool = resolveActionTool(ctx.question, {
    history: ctx.history,
    hasPendingAttachments:
      hasBuildDemoAttachments(ctx.memoryKey) ||
      ctx.attachments.some((att) => Boolean(att.contentBase64?.trim())),
    hasIncomingAttachments: ctx.attachments.some((att) =>
      Boolean(att.contentBase64?.trim()),
    ),
  });
  if (!tool) {
    return {
      ok: false,
      agent: "actions",
      answer: "Không xác định được action phù hợp.",
      confidence: 0,
      sources: [],
      spans: [
        {
          agent: "actions",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: "No action tool resolved",
        },
      ],
    };
  }

  const allowedBuildDemoBrands = (() => {
    const role = String(ctx.role || "").trim().toLowerCase();
    if (role === "admin") return null;
    const account = ctx.email ? findAccountByEmail(ctx.email) : undefined;
    return account ? resolveAllowedBuildDemoBrands(account) : [];
  })();

  const buildDemoRun =
    tool === "upload_sftp_demo" || tool === "compress_demo_assets"
      ? ctx.req
        ? await runBuildDemoTool({
            question: ctx.question,
            provider: ctx.provider,
            history: ctx.history,
            attachments: ctx.attachments,
            allowedBrands: allowedBuildDemoBrands,
            memoryKey: ctx.memoryKey,
            actionTool: tool,
            req: ctx.req,
          })
        : {
            answer: "Không thể chạy Build Demo: thiếu request context.",
            executed: false,
          }
      : null;
  const answer = buildDemoRun?.answer ?? executeTool(tool);

  return {
    ok: true,
    agent: "actions",
    answer,
    confidence: 0.95,
    sources: [],
    toolCalled: tool,
    buildDemoProcessing: buildDemoRun?.executed ?? false,
    fallbackUsed: false,
    spans: [
      {
        agent: "actions",
        startedAt,
        endedAt: Date.now(),
        ok: true,
        confidence: 0.95,
        toolCalled: tool,
      },
    ],
  };
}

