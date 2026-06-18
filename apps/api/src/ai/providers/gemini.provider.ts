import type { LlmProvider } from "./llm-provider.interface.js";

export class GeminiProvider implements LlmProvider {
  async complete(): Promise<string> {
    throw new Error("Gemini provider is not implemented yet.");
  }
}
