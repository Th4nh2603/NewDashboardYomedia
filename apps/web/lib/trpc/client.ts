import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@yomedia/api";
import { withApiAuthHeaders } from "../apiAuth";
import { serverApiOrigin } from "../serverApiOrigin";

function trpcUrl(): string {
  const base = serverApiOrigin();
  return `${base}/api/trpc`;
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: trpcUrl(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformer: superjson as any,
      async headers() {
        return withApiAuthHeaders({ "Content-Type": "application/json" });
      },
    }),
  ],
});
