import { config } from "dotenv";

const envDir = new URL("../../", import.meta.url);

config({ path: new URL(".env", envDir) });
config({ path: new URL(".env.local", envDir), override: true });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
  CLERK_JWT_KEY: process.env.CLERK_JWT_KEY ?? "",
  CLERK_AUTHORIZED_PARTIES: process.env.CLERK_AUTHORIZED_PARTIES ?? "",
  SFTP_HOST: process.env.SFTP_HOST ?? "",
  SFTP_PORT: Number(process.env.SFTP_PORT ?? 22),
  SFTP_USERNAME: process.env.SFTP_USERNAME ?? process.env.SFTP_USER ?? "",
  SFTP_PASSWORD: process.env.SFTP_PASSWORD ?? "",
  SFTP_PRIVATE_KEY: process.env.SFTP_PRIVATE_KEY ?? "",
  SFTP_ROOT: process.env.SFTP_ROOT ?? "/script/demo",
  SFTP_MEDIA_HOST: process.env.SFTP_MEDIA_HOST ?? process.env.SFTP_HOST_MEDIA ?? "",
  SFTP_MEDIA_PORT: Number(process.env.SFTP_MEDIA_PORT ?? process.env.SFTP_PORT_MEDIA ?? 22),
  SFTP_MEDIA_USERNAME: process.env.SFTP_MEDIA_USERNAME ?? process.env.SFTP_USER_MEDIA ?? "",
  SFTP_MEDIA_PASSWORD: process.env.SFTP_MEDIA_PASSWORD ?? process.env.SFTP_PASSWORD_MEDIA ?? "",
  SFTP_MEDIA_PRIVATE_KEY: process.env.SFTP_MEDIA_PRIVATE_KEY ?? "",
  SFTP_MEDIA_ROOT: process.env.SFTP_MEDIA_ROOT ?? "/script/demo",
};
