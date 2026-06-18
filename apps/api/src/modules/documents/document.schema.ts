import { z } from "zod";

export const documentIdSchema = z.object({
  documentId: z.string().uuid(),
});
