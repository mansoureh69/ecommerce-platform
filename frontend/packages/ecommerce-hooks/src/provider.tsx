"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CommerceApi, SessionClient } from "@ecommerce/api-client";

interface EcommerceClients {
  api: CommerceApi;
  session: SessionClient;
}

const EcommerceContext = createContext<EcommerceClients | null>(null);

export function EcommerceProvider({
  api,
  session,
  children,
}: EcommerceClients & { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <EcommerceContext.Provider value={{ api, session }}>
        {children}
      </EcommerceContext.Provider>
    </QueryClientProvider>
  );
}

export function useEcommerceClients(): EcommerceClients {
  const clients = useContext(EcommerceContext);
  if (!clients) throw new Error("EcommerceProvider is required.");
  return clients;
}
