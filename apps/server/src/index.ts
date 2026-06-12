import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import net from "node:net";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "url";
import * as trpcExpress from "@trpc/server/adapters/express";
import { sftpRouter } from "./modules/media/controllers/sftp.js";
import { uploadRouter } from "./modules/media/controllers/upload.js";
import { fileUploadRouter } from "./modules/media/controllers/fileUpload.js";
import { smtpRouter, legacySendEmailHandler } from "./modules/media/controllers/smtp.js";
import { geminiRouter } from "./modules/media/controllers/gemini.js";
import { testDataRestRouter } from "./modules/platform/controllers/testDataRest.js";
import { errorHandler, notFoundHandler } from "./lib/http/errors.js";
import { requireClerkAuth } from "./modules/auth/lib/clerkAuth.js";
import { appRouter } from "./trpc/appRouter.js";
import { createContext } from "./trpc/context.js";

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCsvEnv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAllowedCorsOrigins(): string[] {
  const configured = [
    ...parseCsvEnv(process.env.CORS_ORIGINS),
    ...parseCsvEnv(process.env.CLERK_AUTHORIZED_PARTIES),
  ];
  if (configured.length) return [...new Set(configured)];
  if (process.env.NODE_ENV === "production") return [];
  return [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
  ];
}

const allowedCorsOrigins = getAllowedCorsOrigins();

function findAvailablePort(
  startPort: number,
  host: string,
  maxAttempts = 30,
): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryPort = () => {
      if (port >= startPort + maxAttempts) {
        reject(
          new Error(
            `No free TCP port found between ${startPort} and ${startPort + maxAttempts - 1} on ${host}`,
          ),
        );
        return;
      }
      const tester = net.createServer();
      tester.once("error", (err: NodeJS.ErrnoException) => {
        tester.close();
        if (err.code === "EADDRINUSE") {
          console.warn(`Port ${port} in use, trying ${port + 1}…`);
          port += 1;
          tryPort();
        } else {
          reject(err);
        }
      });
      tester.listen(port, host, () => {
        tester.close(() => resolve(port));
      });
    };
    tryPort();
  });
}

function writeDevApiPortFile(port: number) {
  if (process.env.NODE_ENV === "production") return;
  try {
    const webApiPortFile = path.join(
      __dirname,
      "..",
      "..",
      "web",
      ".dev-api-port",
    );
    fs.writeFileSync(webApiPortFile, String(port), "utf8");
  } catch (e) {
    console.warn("Could not write apps/web/.dev-api-port (Vite API proxy):", e);
  }
}

app.use(
  cors({
    origin: (
      origin: string | undefined,
      cb: (err: null, allow: boolean | string) => void,
    ) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, allowedCorsOrigins.includes(origin) ? origin : false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-role"],
  }),
);

/** tRPC must run before express.json so POST batch bodies are not lost or mis-parsed. */
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "25mb" }));

/** REST-only: binary SFTP upload & ZIP download (streaming / raw body). */
app.use("/api/sftp", sftpRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/file-upload", fileUploadRouter);
app.use("/api/smtp", smtpRouter);
app.use("/api/gemini", geminiRouter);
app.use("/api/test-data", testDataRestRouter);
app.post("/api/send-email", requireClerkAuth, legacySendEmailHandler);

app.use(notFoundHandler);
app.use(errorHandler);

const LISTEN_HOST = process.env.LISTEN_HOST || "0.0.0.0";

findAvailablePort(BASE_PORT, LISTEN_HOST)
  .then((port) => {
    if (port !== BASE_PORT) {
      console.warn(
        `API bound to ${port} (PORT ${BASE_PORT} was in use). Vite dev reads apps/web/.dev-api-port for /api proxy.`,
      );
    }
    writeDevApiPortFile(port);
    const server = createHttpServer(app);
    server.listen(port, LISTEN_HOST, () => {
      console.log(
        `Server listening on http://${LISTEN_HOST === "0.0.0.0" ? "localhost" : LISTEN_HOST}:${port}`,
      );
      console.log("tRPC endpoint: /api/trpc");
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
