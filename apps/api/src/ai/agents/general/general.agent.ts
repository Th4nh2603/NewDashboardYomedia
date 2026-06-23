import type { AgentContext } from "../../runtime/agent-context.js";
import type { LlmProvider } from "../../providers/llm-provider.interface.js";
import type { AgentResult } from "../orchestrator/orchestrator.types.js";
import { AppError } from "../../../shared/errors/app-error.js";

type GeneralProviderName = "gemini" | "openai";

const providerNotConfiguredMessage =
  "LLM provider is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.";

function buildGeneralPrompt(context: AgentContext): string {
  return [
    "You are YoMedia's internal dashboard assistant.",
    "Answer the user's general chat message naturally and concisely.",
    "Use Vietnamese when the user writes Vietnamese, English when the user writes English, or a friendly bilingual style for short greetings.",
    "Do not claim access to documents, reports, SQL data, or tools for this general response.",
    "",
    `User message: ${context.message}`,
  ].join("\n");
}

export class GeneralAgent {
  constructor(
    private readonly providers: Partial<Record<GeneralProviderName, LlmProvider>> = {},
  ) {}

  async execute(context: AgentContext): Promise<AgentResult> {
    const providerName = context.provider ?? "gemini";
    const provider = this.providers[providerName];
    if (!provider) {
      throw new AppError(providerNotConfiguredMessage, 500);
    }

    const answer = await provider.complete(buildGeneralPrompt(context));

    return {
      agent: "general",
      output: {
        answer,
        provider: providerName,
      },
      steps: [
        {
          name: "general.llm.generate",
          status: "success",
          summary: `Generated a general response with ${providerName}.`,
        },
      ],
    };
  }
}
