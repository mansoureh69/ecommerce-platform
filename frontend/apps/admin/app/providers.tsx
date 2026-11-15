"use client";

import { useState, type ReactNode } from "react";
import { createCommerceApi, createSessionClient } from "@ecommerce/api-client";
import { EcommerceProvider } from "@ecommerce/ecommerce-hooks";

export function Providers({ children }: { children: ReactNode }) {
  const [clients] = useState(() => ({
    api: createCommerceApi({ baseUrl: "/api/backend" }),
    session: createSessionClient(),
  }));
  return <EcommerceProvider {...clients}>{children}</EcommerceProvider>;
}
