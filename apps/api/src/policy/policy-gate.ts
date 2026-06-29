import type { AgentContext } from "../ai/runtime/agent-context.js";
import type { RegisteredTool } from "../ai/tools/tool-registry.js";
import { hasAllPermissions, isToolAllowed } from "./permissions.js";

export type PolicyDecision =
  | { decision: "allow" }
  | { decision: "deny"; reason: string }
  | { decision: "requiresApproval"; reason: string };

function hasUnsafePathSegment(value: string): boolean {
  return /(^|\/)\.\.(\/|$)/.test(value.replace(/\\/g, "/"));
}

function checkCommonPathSafety(input: Record<string, unknown>): string | null {
  for (const key of ["path", "remotePath", "oldPath", "newPath"]) {
    const value = input[key];
    if (typeof value === "string" && hasUnsafePathSegment(value)) {
      return `Rejected unsafe path argument ${key}.`;
    }
  }
  return null;
}

export class PolicyGate {
  decideToolExecution(
    tool: RegisteredTool<Record<string, unknown>>,
    input: Record<string, unknown>,
    context: AgentContext,
  ): PolicyDecision {
    const pathFailure = checkCommonPathSafety(input);
    if (pathFailure) return { decision: "deny", reason: pathFailure };

    if (!hasAllPermissions(context, tool.requiredPermissions)) {
      return {
        decision: "deny",
        reason: `Missing required permission for tool ${tool.name}.`,
      };
    }

    if (!isToolAllowed(context, tool.name)) {
      return {
        decision: "deny",
        reason: `Tool ${tool.name} is not in the backend allowed tool scope.`,
      };
    }

    const scopeFailure = tool.checkScope?.(input, context);
    if (scopeFailure) return { decision: "deny", reason: scopeFailure };

    if (tool.requiresApproval) {
      return {
        decision: "requiresApproval",
        reason:
          tool.approvalReason ??
          "This tool can mutate data or affect external systems.",
      };
    }

    return { decision: "allow" };
  }
}
