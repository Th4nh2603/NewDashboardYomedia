import { middleware } from "../trpc.js";

export const trpcLoggingMiddleware = middleware(async ({ path, type, next }) => {
  const startedAt = Date.now();
  const result = await next();
  console.log(`${type} ${path} ${Date.now() - startedAt}ms`);
  return result;
});
