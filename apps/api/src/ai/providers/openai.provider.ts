import type { LlmProvider } from "./llm-provider.interface.js";

export class OpenAiProvider implements LlmProvider {
  async complete(): Promise<string> {
    throw new Error("OpenAI provider is not implemented yet.");
  }
}
