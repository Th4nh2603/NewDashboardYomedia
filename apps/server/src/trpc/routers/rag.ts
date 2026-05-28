import { z } from "zod";
import { answerWithRag } from "../../lib/ai/rag.js";
import { HttpError } from "../../lib/http/errors.js";
import { protectedProcedure, router, runHandler } from "../trpc.js";

const chatAiProviderSchema = z.enum(["gemini", "openai"]);

export const ragRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        question: z.string().default(""),
        provider: chatAiProviderSchema.optional(),
        attachments: z
          .array(
            z.object({
              name: z.string().min(1),
              relativePath: z.string().optional(),
              size: z.number().int().nonnegative(),
              mimeType: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(({ input }) =>
      runHandler(async () => {
        try {
          const result = await answerWithRag({
            question: input.question,
            provider: input.provider,
            attachments: input.attachments,
          });
          return { ok: true as const, ...result };
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unknown RAG error";
          throw new HttpError(400, message, { code: "RAG_ERROR" });
        }
      }),
    ),
});
