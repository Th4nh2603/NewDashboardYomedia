import { z } from "zod";

export const listKnowledgeBasesSchema = z.object({
  brandId: z.string().min(1).optional(),
});
