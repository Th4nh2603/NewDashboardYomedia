import { z } from "zod";

export const intentSchema = z.object({
  intent: z.enum(["rag", "sql", "tool", "general"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});
