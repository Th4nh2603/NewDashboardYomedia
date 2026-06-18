import { z } from "zod";

export const campaignIdSchema = z.object({
  campaignId: z.string().uuid(),
});
