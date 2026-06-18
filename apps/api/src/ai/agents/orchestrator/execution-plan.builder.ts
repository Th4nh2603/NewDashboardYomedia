import type { ChatIntent } from "./orchestrator.types.js";

export function buildExecutionPlan(intents: ChatIntent[]): ChatIntent[] {
  return intents.filter((intent) => intent !== "MULTI_INTENT");
}
