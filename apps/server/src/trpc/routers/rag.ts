import { z } from "zod";
import { protectedProcedure, router, runHandler } from "../trpc.js";
import { getUserRole } from "../../lib/auth/role.js";
import { answerWithRag } from "../../lib/ai/orchestration/answerWithRag.js";
import {
  buildShortMemoryKey,
  clearShortMemory,
  clearShortMemoryByPrefix,
} from "../../lib/ai/memory/shortMemory.js";
import { logChatEvent } from "../../lib/ai/logging/aiLogger.js";

export const ragRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        sessionId: z.string().min(1).max(128).optional(),
        provider: z.enum(["gemini", "openai"]).optional(),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              relativePath: z.string().optional(),
              size: z.number(),
              mimeType: z.string().optional(),
              contentBase64: z.string().optional(),
              encoding: z.enum(["base64"]).optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        const role = getUserRole(ctx.req);
        const email = ctx.auth?.email || undefined;
        return answerWithRag({
          question: input.question,
          sessionId: input.sessionId,
          provider: input.provider,
          attachments: input.attachments,
          role,
          email,
        });
      }),
    ),
  clearSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1).max(128).optional(),
        allSessions: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        const role = getUserRole(ctx.req);
        const email = ctx.auth?.email || undefined;
        const userPrefix =
          String(email || "").trim().toLowerCase() ||
          `role:${String(role || "guest").trim() || "guest"}`;
        const cleared = input.allSessions
          ? clearShortMemoryByPrefix(userPrefix)
          : (() => {
              const key = buildShortMemoryKey({
                email,
                role,
                sessionId: input.sessionId,
              });
              clearShortMemory(key);
              return 1;
            })();
        await logChatEvent({
          action: "chat_clear_history",
          description: input.allSessions
            ? "Cleared all short-memory chat sessions"
            : `Cleared short-memory session ${input.sessionId || "default"}`,
          role,
          email,
          metadata: { cleared, allSessions: !!input.allSessions },
        });
        return { ok: true as const, cleared };
      }),
    ),
});
