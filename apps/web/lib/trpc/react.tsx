import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@yomedia/api";
import { withApiAuthHeaders } from "../apiAuth";
import { serverApiOrigin } from "../serverApiOrigin";

export const trpc = createTRPCReact<AppRouter>();

function trpcUrl(): string {
  const base = serverApiOrigin();
  return `${base}/api/trpc`;
}

export const TrpcProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: trpcUrl(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transformer: superjson as any,
          async headers() {
            return withApiAuthHeaders();
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
