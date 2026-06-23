import { env } from "./env.js";

export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
  openaiModel: env.OPENAI_MODEL || "gpt-4o-mini",
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  geminiApiKey: env.GEMINI_API_KEY,
  geminiModel: env.GEMINI_MODEL || "gemini-1.5-flash",
};
