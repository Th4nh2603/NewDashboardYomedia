import { z } from "zod";

export const chatAttachmentSchema = z.object({
  name: z.string().min(1),
  relativePath: z.string().optional(),
  size: z.number().nonnegative(),
  mimeType: z.string().optional(),
  contentBase64: z.string().optional(),
  encoding: z.enum(["base64"]).optional(),
});

export type ChatAttachmentInput = z.infer<typeof chatAttachmentSchema>;
