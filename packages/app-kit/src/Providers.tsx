'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createWSClient,
  httpBatchLink,
  loggerLink,
  splitLink,
  wsLink,
} from '@trpc/client';
import superjson from 'superjson';
import { trpc } from './trpc';
import { TRPC_HTTP_URL, TRPC_WS_URL } from './env';

/**
 * Shared client-side providers for every product app: React Query + a tRPC
 * client that sends credentials (the shared session cookie) to the API and uses
 * a WebSocket link for realtime subscriptions.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  const [trpcClient] = useState(() => {
    const wsClient =
      typeof window !== 'undefined' ? createWSClient({ url: TRPC_WS_URL }) : null;

    return trpc.createClient({
      links: [
        loggerLink({ enabled: () => false }),
        splitLink({
          condition: (op) => op.type === 'subscription',
          true:
            wsClient !== null
              ? wsLink({ client: wsClient, transformer: superjson })
              : httpBatchLink({ url: TRPC_HTTP_URL, transformer: superjson }),
          false: httpBatchLink({
            url: TRPC_HTTP_URL,
            transformer: superjson,
            fetch(url, options) {
              return fetch(url, { ...options, credentials: 'include' });
            },
          }),
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
