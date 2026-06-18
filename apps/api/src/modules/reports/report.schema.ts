import { z } from "zod";

export const reportQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
});
