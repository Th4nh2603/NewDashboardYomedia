import { z } from "zod";

export const responseSchema = z.object({
  answer: z.string(),
});
