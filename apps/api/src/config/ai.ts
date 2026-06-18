import { env } from "./env.js";

export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  geminiApiKey: env.GEMINI_API_KEY,
};
