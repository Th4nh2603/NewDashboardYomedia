import type { AgentTool } from "./tool.interface.js";

export const searchTool: AgentTool = {
  name: "search",
  description: "Search external or internal data sources.",
  inputSchema: {},
  async execute() {
    throw new Error("Search tool is not implemented yet.");
  },
};
