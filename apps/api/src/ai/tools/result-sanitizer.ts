import { sanitizeForLog } from "../../policy/safety-envelope.js";
import type {
  RegisteredTool,
  ToolExecutionResult,
} from "./tool-registry.js";

export function sanitizeToolResult(
  tool: RegisteredTool<Record<string, unknown>>,
  result: ToolExecutionResult,
): ToolExecutionResult {
  const custom = tool.sanitizeResult?.(result);
  const candidate = custom ?? result;
  return {
    ...candidate,
    summary:
      candidate.summary.length > 500
        ? `${candidate.summary.slice(0, 497)}...`
        : candidate.summary,
    data: sanitizeForLog(candidate.data),
  };
}
