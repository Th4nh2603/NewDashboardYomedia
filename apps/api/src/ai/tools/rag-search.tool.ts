import type { AgentTool } from "./tool.interface.js";

export const ragSearchTool: AgentTool = {
  name: "rag-search",
  description: "Search the scoped knowledge base.",
  inputSchema: {},
  async execute() {
    throw new Error("RAG search tool is not implemented yet.");
  },
};
