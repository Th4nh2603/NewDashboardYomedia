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
      }),
    )
    .mutation(({ input }) =>
      runHandler(async () => {
        try {
          const result = await answerWithRag({
            question: input.question,
            provider: input.provider,
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
