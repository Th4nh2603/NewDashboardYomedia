import { z } from "zod";

export const approvalIdSchema = z.object({
  approvalId: z.string().uuid(),
});

export const approvalExecuteSchema = approvalIdSchema.extend({
  args: z.record(z.unknown()).optional(),
});

export const approvalListSchema = z
  .object({
    status: z
      .enum(["pending", "approved", "rejected", "expired", "executed", "failed"])
      .optional(),
    limit: z.number().int().positive().max(100).default(50),
  })
  .optional()
  .default({ limit: 50 });
