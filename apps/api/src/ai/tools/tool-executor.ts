import type { AgentContext } from "../runtime/agent-context.js";
import type {
  RegisteredTool,
  ToolExecutionResult,
} from "./tool-registry.js";
import { sanitizeToolResult } from "./result-sanitizer.js";

export interface ToolExecutorOptions {
  timeoutMs?: number;
  retries?: number;
}

export class ToolExecutor {
  constructor(private readonly options: ToolExecutorOptions = {}) {}

  async execute(
    tool: RegisteredTool<Record<string, unknown>>,
    input: Record<string, unknown>,
    context: AgentContext,
  ): Promise<ToolExecutionResult> {
    const attempts = (this.options.retries ?? 0) + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await this.withTimeout(
          tool.execute(input, context),
          this.options.timeoutMs ?? 15_000,
        );
        return sanitizeToolResult(tool, result);
      } catch (error) {
        lastError = error;
      }
    }

    return {
      status: "failed",
      summary:
        lastError instanceof Error && lastError.message === "TOOL_TIMEOUT"
          ? `Tool ${tool.name} timed out.`
          : `Tool ${tool.name} failed during execution.`,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("TOOL_TIMEOUT")), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
