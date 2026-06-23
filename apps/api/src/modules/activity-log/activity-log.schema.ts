import { z } from "zod";

export const activityLogAppendInputSchema = z.object({
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userRole: z.string().optional(),
  action: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  target: z.string().trim().max(1000).optional().default(""),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
});

export const activityLogListInputSchema = z
  .object({
    email: z.string().trim().email().optional(),
    special: z.enum(["manager-team", "manage-demo-uploads"]).optional(),
    scope: z.enum(["demo", "media"]).optional(),
    limit: z.number().int().min(1).max(500).optional().default(200),
  })
  .optional()
  .default({});

export type ActivityLogAppendInput = z.infer<
  typeof activityLogAppendInputSchema
>;

export type ActivityLogListInput = z.infer<typeof activityLogListInputSchema>;

