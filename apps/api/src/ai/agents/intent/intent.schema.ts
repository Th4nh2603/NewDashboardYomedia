import { z } from "zod";

export const intentSchema = z.object({
  intents: z.array(
    z.enum(["GENERAL_CHAT", "RAG_SEARCH", "SQL_QUERY", "MCP_TOOL", "MULTI_INTENT"]),
  ),
});
