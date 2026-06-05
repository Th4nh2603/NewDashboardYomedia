import type { AgentContext, AgentName, AgentResult } from "../core/types.js";
import { runActionAgent } from "../agents/actions/runActionAgent.js";
import { runRagAgent } from "../agents/rag/runRagAgent.js";
import { runFreeChatAgent } from "../agents/freeChat/runFreeChatAgent.js";
import { runSqlAgent } from "../agents/sql/runSqlAgent.js";
import { runDashboardAgent } from "../agents/dashboard/runDashboardAgent.js";

type AgentRunner = (ctx: AgentContext) => Promise<AgentResult>;

const RUNNERS: Record<AgentName, AgentRunner | undefined> = {
  actions: runActionAgent,
  rag: runRagAgent,
  free_chat: runFreeChatAgent,
  sql: runSqlAgent,
  dashboard: runDashboardAgent,
  search: undefined,
};

export function getAgentRunner(agent: AgentName): AgentRunner | null {
  return RUNNERS[agent] ?? null;
}

export async function runAgents(
  agents: AgentName[],
  ctx: AgentContext,
): Promise<AgentResult[]> {
  const unique = [...new Set(agents)];
  const tasks = unique.map(async (agent) => {
    const runner = getAgentRunner(agent);
    if (!runner) {
      return {
        ok: false,
        agent,
        answer: `Agent "${agent}" chưa được triển khai.`,
        confidence: 0,
        sources: [],
        spans: [
          {
            agent,
            startedAt: Date.now(),
            endedAt: Date.now(),
            ok: false,
            error: "Agent not implemented",
          },
        ],
      } satisfies AgentResult;
    }
    return runner(ctx);
  });
  return Promise.all(tasks);
}

export async function runSingleAgent(
  agent: AgentName,
  ctx: AgentContext,
): Promise<AgentResult> {
  const results = await runAgents([agent], ctx);
  return results[0];
}
