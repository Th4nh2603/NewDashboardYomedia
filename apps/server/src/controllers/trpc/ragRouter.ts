import { protectedProcedure, router, runHandler } from "../../trpc/trpc.js";
import { getUserRole } from "../../lib/auth/role.js";
import { answerWithRag } from "../../lib/ai/orchestration/answerWithRag.js";
import {
  buildShortMemoryKey,
  clearShortMemory,
  clearShortMemoryByPrefix,
} from "../../lib/ai/memory/shortMemory.js";
import { logChatEvent } from "../../lib/ai/logging/aiLogger.js";
import {
  ragClearSessionInputSchema,
  ragQueryInputSchema,
} from "../../shared/schemas/rag.schema.js";
import { assertChatAccess } from "../../services/authPolicy.service.js";

export const ragRouter = router({
  query: protectedProcedure
    .input(ragQueryInputSchema)
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        assertChatAccess(ctx.req);
        const role = getUserRole(ctx.req);
        const email = ctx.auth?.email || undefined;
        return answerWithRag({
          question: input.question,
          sessionId: input.sessionId,
          provider: input.provider,
          attachments: input.attachments,
          role,
          email,
          req: ctx.req,
        });
      }),
    ),
  clearSession: protectedProcedure
    .input(ragClearSessionInputSchema)
    .mutation(({ ctx, input }) =>
      runHandler(async () => {
        assertChatAccess(ctx.req);
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
