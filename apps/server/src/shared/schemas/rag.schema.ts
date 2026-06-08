import { z } from "zod";
import { chatAttachmentSchema } from "./chatAttachment.schema.js";

export const ragQueryInputSchema = z.object({
  question: z.string().min(1),
  sessionId: z.string().min(1).max(128).optional(),
  provider: z.enum(["gemini", "openai"]).optional(),
  attachments: z.array(chatAttachmentSchema).optional(),
});

export const ragClearSessionInputSchema = z.object({
  sessionId: z.string().min(1).max(128).optional(),
  allSessions: z.boolean().optional(),
});

export type RagQueryInput = z.infer<typeof ragQueryInputSchema>;
export type RagClearSessionInput = z.infer<typeof ragClearSessionInputSchema>;
