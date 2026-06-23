import { z } from "zod";

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10_000),
  tenantId: z.string().min(1).optional(),
  brandId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  permissions: z.array(z.string().min(1)).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
  pageContext: z.unknown().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1).max(500),
        relativePath: z.string().min(1).max(1_000).optional(),
        size: z.number().int().nonnegative(),
        mimeType: z.string().min(1).max(200).optional(),
      }),
    )
    .max(100)
    .optional(),
  provider: z.enum(["gemini", "openai"]).optional(),
});
