import type { EventSourcePolyfillInit } from "event-source-polyfill";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  httpBatchLink,
  loggerLink,
  splitLink,
  unstable_httpSubscriptionLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { EventSourcePolyfill, NativeEventSource } from "event-source-polyfill";
import superjson from "superjson";
import { ReadableStream, TransformStream } from "web-streams-polyfill";

import type { AppRouter } from "@acme/api";

import { getBaseUrl } from "./base-url";

import "@azure/core-asynciterator-polyfill";

/**
 * A set of typesafe hooks for consuming your API.
 */
export const api = createTRPCReact<AppRouter>();
export { type RouterInputs, type RouterOutputs } from "@acme/api";

// @ts-expect-error - Polyfill EventSource for React Native
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
global.EventSource = NativeEventSource || EventSourcePolyfill;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
global.ReadableStream = global.ReadableStream || ReadableStream;
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
global.TransformStream = global.TransformStream || TransformStream;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EventSourceInit extends EventSourcePolyfillInit {}
}

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export function TRPCProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
          colorMode: "ansi",
        }),
        splitLink({
          condition: (op) => op.type === "subscription",
          false: httpBatchLink({
            transformer: superjson,
            url: `${getBaseUrl()}/api/trpc`,
            headers() {
              const headers = new Map<string, string>();
              headers.set("x-trpc-source", "expo-react");

              return Object.fromEntries(headers);
            },
          }),
          true: unstable_httpSubscriptionLink({
            transformer: superjson,
            url: `${getBaseUrl()}/api/trpc`,
            eventSourceOptions: {
              headers: {
                "x-trpc-source": "expo-http-subscription",
              },
              heartbeatTimeout: Number.POSITIVE_INFINITY,
            },
          }),
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </api.Provider>
  );
}
