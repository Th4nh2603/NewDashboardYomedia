import type { LlmProvider } from "./llm-provider.interface.js";

export class AnthropicProvider implements LlmProvider {
  async complete(): Promise<string> {
    throw new Error("Anthropic provider is not implemented yet.");
  }
}
