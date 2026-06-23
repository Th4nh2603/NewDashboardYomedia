import type { LlmProvider } from "./llm-provider.interface.js";
import { AppError } from "../../shared/errors/app-error.js";

const providerNotConfiguredMessage =
  "LLM provider is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.";

function extractOpenAiText(payload: unknown): string {
  const response = payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const content = response.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : "";

  if (!text) {
    throw new AppError("LLM provider returned an empty response.", 502);
  }

  return text;
}

export class OpenAiProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError(providerNotConfiguredMessage, 500);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new AppError("LLM provider request failed.", 502);
    }

    return extractOpenAiText(await response.json());
  }
}
