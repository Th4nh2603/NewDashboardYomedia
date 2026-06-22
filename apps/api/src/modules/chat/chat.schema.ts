import { z } from "zod";

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10_000),
  tenantId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  permissions: z.array(z.string().min(1)).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
  pageContext: z
    .object({
      route: z.string().min(1).max(500),
      title: z.string().min(1).max(500).optional(),
      selectedBrandId: z.string().min(1).optional(),
      filters: z.record(z.unknown()).optional(),
    })
    .optional(),
});
