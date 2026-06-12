import type { AnyRouter } from "@trpc/server";

/** Shared AppRouter contract for clients without importing server implementation source. */
export type AppRouter = AnyRouter;
export { trpcTransformer } from "./trpcTransformer.js";
