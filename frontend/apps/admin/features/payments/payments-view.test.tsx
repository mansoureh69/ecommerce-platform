import { ApiError } from "@ecommerce/api-client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeClients, order, payment, renderWithClients } from "../../test/render";
import { PaymentDetailView } from "./payments-view";

const id = order().id;
const notFound = () => Promise.reject(new ApiError("none", 404, "not-found"));

describe("PaymentDetailView", () => {
  it("validates the bank reference before settling", async () => {
    const settlePayment = vi.fn();
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "PendingPayment" })), paymentFor: vi.fn().mockImplementation(notFound), settlePayment }));
    await userEvent.click(await screen.findByRole("button", { name: "Record settlement" }));
    expect(await screen.findByText("A bank reference is required.")).toBeInTheDocument();
    expect(settlePayment).not.toHaveBeenCalled();
  });

  it("records a settlement with the order total prefilled", async () => {
    const settlePayment = vi.fn().mockResolvedValue(payment());
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "PendingPayment" })), paymentFor: vi.fn().mockImplementation(notFound), settlePayment }));
    await userEvent.type(await screen.findByLabelText("Bank reference"), "bank-77");
    await userEvent.click(screen.getByRole("button", { name: "Record settlement" }));
    await waitFor(() => expect(settlePayment).toHaveBeenCalledWith({ orderId: id, amount: 20, currency: "USD", reference: "bank-77" }));
  });

  it("surfaces a rejected settlement instead of pretending it worked", async () => {
    const settlePayment = vi.fn().mockRejectedValue(new ApiError("Settlement amount must equal the order total.", 409, "conflict"));
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "PendingPayment" })), paymentFor: vi.fn().mockImplementation(notFound), settlePayment }));
    await userEvent.type(await screen.findByLabelText("Bank reference"), "bank-77");
    await userEvent.click(screen.getByRole("button", { name: "Record settlement" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Settlement amount must equal the order total.");
  });

  it("asks for confirmation before recording a refund", async () => {
    const refundPayment = vi.fn().mockResolvedValue(payment({ refundReference: "ref-1" }));
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({ order: vi.fn().mockResolvedValue(order()), paymentFor: vi.fn().mockResolvedValue(payment()), refundPayment }));
    await userEvent.type(await screen.findByLabelText("Refund reference"), "ref-1");
    await userEvent.click(screen.getByRole("button", { name: "Record refund" }));
    expect(refundPayment).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Record refund" }));
    await waitFor(() => expect(refundPayment).toHaveBeenCalledWith({ orderId: id, reference: "ref-1" }));
  });

  it("shows audit details and hides forms for a refunded payment", async () => {
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({
      order: vi.fn().mockResolvedValue(order({ status: "Refunded" })),
      paymentFor: vi.fn().mockResolvedValue(payment({ refundReference: "ref-9", refundedBy: "33333333-aaaa-bbbb-cccc-000000000003", refundedAt: "2026-01-02T10:00:00Z" })),
    }));
    expect(await screen.findByText("ref-9")).toBeInTheDocument();
    expect(screen.getByText("22222222")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record/ })).not.toBeInTheDocument();
  });

  it("says so when no payment exists", async () => {
    renderWithClients(<PaymentDetailView orderId={id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "Cancelled" })), paymentFor: vi.fn().mockImplementation(notFound) }));
    expect(await screen.findByText("No payment has been recorded for this order.")).toBeInTheDocument();
  });
});
