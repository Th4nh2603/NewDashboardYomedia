import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/routers/index.js";
import { corsMiddleware } from "./middleware/cors.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { handleTrpcError } from "./trpc/error-handler.js";

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(cors(corsMiddleware));
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: handleTrpcError,
    }),
  );

  app.use(errorMiddleware);

  return app;
}
