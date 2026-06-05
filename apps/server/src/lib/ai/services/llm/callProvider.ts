import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getModel, getSystemPrompt } from "../../core/config.js";
import type { ChatProvider, MemoryMessage } from "../../core/types.js";
import { serviceUnavailable } from "../../../http/errors.js";

async function callOpenAi(prompt: string, history: MemoryMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw serviceUnavailable("OPENAI_API_KEY is missing");
  }
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: getModel("openai"),
    messages: [
      { role: "system", content: getSystemPrompt() },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

async function callGemini(prompt: string, history: MemoryMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw serviceUnavailable("GEMINI_API_KEY is missing");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getModel("gemini"),
    systemInstruction: getSystemPrompt(),
  });
  const response = await model.generateContent({
    contents: [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: prompt }] },
    ],
  });
  return response.response.text().trim();
}

export async function callProvider(
  provider: ChatProvider,
  prompt: string,
  history: MemoryMessage[],
) {
  return provider === "openai"
    ? callOpenAi(prompt, history)
    : callGemini(prompt, history);
}

