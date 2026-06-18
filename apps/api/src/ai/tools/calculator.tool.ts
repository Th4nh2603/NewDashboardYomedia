import type { AgentTool } from "./tool.interface.js";

export const calculatorTool: AgentTool = {
  name: "calculator",
  description: "Run basic calculations.",
  inputSchema: {},
  async execute() {
    throw new Error("Calculator tool is not implemented yet.");
  },
};
