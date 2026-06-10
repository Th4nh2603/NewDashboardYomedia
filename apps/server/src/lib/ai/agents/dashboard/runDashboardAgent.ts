import type { AgentContext, AgentResult } from "../../core/types.js";
import {
  dashboardAllowedRoles,
  isRoleAllowed,
} from "../../core/agentAccess.js";
import { callProvider } from "../../services/llm/callProvider.js";
import {
  formatDashboardSummary,
  summarizeActivityDashboard,
} from "../../tools/analytics/index.js";
import { logBestEffort } from "../../../logBestEffort.js";

export async function runDashboardAgent(ctx: AgentContext): Promise<AgentResult> {
  const startedAt = Date.now();

  if (!isRoleAllowed(ctx.role, dashboardAllowedRoles())) {
    return {
      ok: false,
      agent: "dashboard",
      answer: "Bạn không có quyền xem thống kê dashboard. Liên hệ admin.",
      confidence: 0,
      sources: ["activity-log"],
      spans: [
        {
          agent: "dashboard",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: "Forbidden role for dashboard agent",
        },
      ],
    };
  }

  let summaryText = "";
  try {
    const summary = await summarizeActivityDashboard({
      role: ctx.role,
      email: ctx.email,
      limit: 200,
    });
    summaryText = formatDashboardSummary(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dashboard data unavailable";
    return {
      ok: false,
      agent: "dashboard",
      answer: `Không lấy được dữ liệu dashboard: ${message}`,
      confidence: 0,
      sources: ["activity-log"],
      spans: [
        {
          agent: "dashboard",
          startedAt,
          endedAt: Date.now(),
          ok: false,
          error: message,
        },
      ],
    };
  }

  const prompt = [
    "You summarize internal dashboard activity for YoMedia staff.",
    "Use ONLY the data below. Reply concise in Vietnamese.",
    "If user asks for trends, highlight top areas/actions and recent Build Demo activity.",
    "",
    `User question: ${JSON.stringify(ctx.question)}`,
    "",
    "Dashboard data:",
    summaryText,
  ].join("\n");

  let answer = summaryText;
  let usedProvider = ctx.provider;
  try {
    answer = await callProvider(ctx.provider, prompt, ctx.history);
    usedProvider = ctx.provider;
  } catch (primaryError) {
    const fallback = ctx.provider === "openai" ? "gemini" : "openai";
    try {
      answer = await callProvider(fallback, prompt, ctx.history);
      usedProvider = fallback;
    } catch (fallbackErr) {
      logBestEffort("ai.dashboard.provider", fallbackErr);
      answer = summaryText;
    }
  }

  return {
    ok: true,
    agent: "dashboard",
    answer: answer || summaryText,
    confidence: 0.82,
    sources: ["activity-log"],
    fallbackUsed: usedProvider !== ctx.provider,
    metadata: { usedProvider },
    spans: [
      {
        agent: "dashboard",
        startedAt,
        endedAt: Date.now(),
        ok: true,
        confidence: 0.82,
        sources: ["activity-log"],
      },
    ],
  };
}
