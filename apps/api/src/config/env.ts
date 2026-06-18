import { config } from "dotenv";

config({ path: new URL("../../.env", import.meta.url) });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
  CLERK_JWT_KEY: process.env.CLERK_JWT_KEY ?? "",
  CLERK_AUTHORIZED_PARTIES: process.env.CLERK_AUTHORIZED_PARTIES ?? "",
};
