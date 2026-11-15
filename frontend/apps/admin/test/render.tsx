import type { CommerceApi, SessionClient } from "@ecommerce/api-client";
import { EcommerceProvider } from "@ecommerce/ecommerce-hooks";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

type AdminApi = Partial<Record<keyof CommerceApi["admin"], ReturnType<typeof vi.fn>>>;

export function fakeClients(admin: AdminApi = {}, api: Record<string, unknown> = {}, session: Partial<SessionClient> = {}) {
  return {
    api: { ...api, admin } as unknown as CommerceApi,
    session: {
      login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined),
      session: vi.fn().mockResolvedValue({ authenticated: true, expiresAt: null, roles: ["Admin"] }),
      ...session,
    } as SessionClient,
  };
}

export function renderWithClients(ui: ReactElement, clients = fakeClients()) {
  return { clients, ...render(<EcommerceProvider {...clients}>{ui}</EcommerceProvider>) };
}

export const order = (overrides: Record<string, unknown> = {}) => ({
  id: "11111111-aaaa-bbbb-cccc-000000000001", customerId: "c1", status: "Paid",
  total: { amount: 20, currency: "USD" },
  lines: [{ productId: "p1", name: "Widget", unitPrice: { amount: 10, currency: "USD" }, quantity: 2 }],
  ...overrides,
});

export const payment = (overrides: Record<string, unknown> = {}) => ({
  id: "pay1", orderId: order().id, amount: { amount: 20, currency: "USD" }, reference: "bank-1",
  recordedBy: "22222222-aaaa-bbbb-cccc-000000000002", settledAt: "2026-01-01T10:00:00Z",
  refundReference: null, refundedBy: null, refundedAt: null, ...overrides,
});
