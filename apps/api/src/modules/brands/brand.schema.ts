import { z } from "zod";

export const brandIdSchema = z.object({
  brandId: z.string().uuid(),
});
