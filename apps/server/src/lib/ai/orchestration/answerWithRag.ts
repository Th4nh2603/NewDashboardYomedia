import type {
  ChatAttachmentMeta,
  ChatProvider,
  RagAnswerResult,
} from "../core/types.js";
import { runSupervisor } from "../agents/supervisor/runSupervisor.js";

export async function answerWithRag(input: {
  question: string;
  provider?: ChatProvider;
  attachments?: ChatAttachmentMeta[];
  role: string;
  email?: string;
  sessionId?: string;
}): Promise<RagAnswerResult | { ok: false; answer: string; provider: ChatProvider }> {
  const result = await runSupervisor(input);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    answer: result.answer,
    provider: result.provider,
    intent: result.intent,
    sources: result.sources,
    fallbackUsed: result.fallbackUsed,
    toolCalled: result.toolCalled,
    buildDemoProcessing: result.buildDemoProcessing,
  };
}
