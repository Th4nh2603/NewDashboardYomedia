import type { AgentContext } from "../../runtime/agent-context.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";

export class SqlAgent {
  async execute(_context: AgentContext): Promise<AgentResult> {
    return {
      agent: "sql",
      output: {
        answer:
          "Câu hỏi này cần truy vấn dữ liệu/report. SQL agent đã được route, nhưng backend chưa cấu hình execution policy và repository truy vấn cho yêu cầu này.",
      },
      steps: [
        {
          name: "sql.policy.check",
          status: "skipped",
          summary: "SQL execution is not configured for this chat request.",
        },
      ],
    };
  }
}
