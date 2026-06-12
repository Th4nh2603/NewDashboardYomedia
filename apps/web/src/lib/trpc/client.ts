import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@yomedia/api";
import { trpcTransformer } from "@yomedia/api";
import { withApiAuthHeaders } from "../apiAuth";
import { serverApiOrigin } from "../serverApiOrigin";

function trpcUrl(): string {
  const base = serverApiOrigin();
  return `${base}/api/trpc`;
}

export const trpcClient: any = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: trpcUrl(),
      // AppRouter type is resolved from server; cast keeps link aligned with initTRPC transformer.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformer: trpcTransformer as any,
      async headers() {
        return withApiAuthHeaders();
      },
    }),
  ],
});
