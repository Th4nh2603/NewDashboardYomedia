import type { LlmProvider } from "./llm-provider.interface.js";
import { AppError } from "../../shared/errors/app-error.js";

const providerNotConfiguredMessage =
  "LLM provider is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.";

function normalizeModelName(model: string): string {
  return model.replace(/^models\//, "");
}

function extractGeminiText(payload: unknown): string {
  const response = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: unknown;
        }>;
      };
    }>;
  };
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new AppError("LLM provider returned an empty response.", 502);
  }

  return text;
}

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError(providerNotConfiguredMessage, 500);
    }

    const model = normalizeModelName(this.model);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        this.apiKey,
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new AppError("LLM provider request failed.", 502);
    }

    return extractGeminiText(await response.json());
  }
}
