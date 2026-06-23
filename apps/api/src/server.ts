import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info("[server.started]", {
    event: "server.started",
    port: env.PORT,
  });
});

process.on("unhandledRejection", (reason) => {
  logger.error("[process.unhandled_rejection]", {
    event: "process.unhandled_rejection",
    reason,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("[process.uncaught_exception]", {
    event: "process.uncaught_exception",
    error,
  });
  process.exit(1);
});
