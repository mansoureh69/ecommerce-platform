import { ApiError } from "@ecommerce/api-client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeClients, order, payment, renderWithClients } from "../../test/render";
import { OrderDetailView, OrdersView } from "./orders-view";

const notFound = () => Promise.reject(new ApiError("none", 404, "not-found"));

describe("OrdersView", () => {
  it("lists orders from the admin endpoint and filters by status", async () => {
    const orders = vi.fn().mockResolvedValue({ items: [order()], number: 1, size: 20, total: 1 });
    renderWithClients(<OrdersView />, fakeClients({ orders }));
    expect(await screen.findByText("$20.00")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "Shipped");
    await waitFor(() => expect(orders).toHaveBeenLastCalledWith({ page: 1, size: 20, status: "Shipped" }));
  });

  it("shows loading, empty and error states", async () => {
    const orders = vi.fn().mockResolvedValueOnce({ items: [], number: 1, size: 20, total: 0 });
    const { unmount } = renderWithClients(<OrdersView />, fakeClients({ orders }));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("No orders match.")).toBeInTheDocument();
    unmount();

    renderWithClients(<OrdersView />, fakeClients({ orders: vi.fn().mockRejectedValue(new ApiError("Boom", 500, "server")) }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("sends the user back to sign-in when the session has expired", async () => {
    renderWithClients(<OrdersView />, fakeClients({ orders: vi.fn().mockRejectedValue(new ApiError("no", 401, "unauthorized")) }));
    expect(await screen.findByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/login?reason=expired");
  });

  it("explains a forbidden response without leaking details", async () => {
    renderWithClients(<OrdersView />, fakeClients({ orders: vi.fn().mockRejectedValue(new ApiError("secret", 403, "forbidden")) }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to do this.");
  });
});

describe("OrderDetailView", () => {
  it("ships a paid order through the admin action", async () => {
    const shipOrder = vi.fn().mockResolvedValue(order({ status: "Shipped" }));
    renderWithClients(<OrderDetailView id={order().id} />, fakeClients({ order: vi.fn().mockResolvedValue(order()), paymentFor: vi.fn().mockResolvedValue(payment()), shipOrder }));
    await userEvent.click(await screen.findByRole("button", { name: "Mark as shipped" }));
    await waitFor(() => expect(shipOrder).toHaveBeenCalledWith(order().id));
    expect(await screen.findByText("Shipped")).toBeInTheDocument();
  });

  it("offers no action once an order is delivered", async () => {
    renderWithClients(<OrderDetailView id={order().id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "Delivered" })), paymentFor: vi.fn().mockResolvedValue(payment()) }));
    expect(await screen.findByText(/No further actions/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ship|deliver|cancel/i })).not.toBeInTheDocument();
  });

  it("requires confirmation before cancelling a pending order", async () => {
    const cancelOrder = vi.fn().mockResolvedValue(order({ status: "Cancelled" }));
    renderWithClients(<OrderDetailView id={order().id} />, fakeClients({ order: vi.fn().mockResolvedValue(order({ status: "PendingPayment" })), paymentFor: vi.fn().mockImplementation(notFound), cancelOrder }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel order" }));
    expect(cancelOrder).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel order" }));
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(order().id));
  });

  it("shows the backend's message when a transition is refused", async () => {
    const shipOrder = vi.fn().mockRejectedValue(new ApiError("Order must be Paid for this operation.", 409, "conflict"));
    renderWithClients(<OrderDetailView id={order().id} />, fakeClients({ order: vi.fn().mockResolvedValue(order()), paymentFor: vi.fn().mockResolvedValue(payment()), shipOrder }));
    await userEvent.click(await screen.findByRole("button", { name: "Mark as shipped" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Order must be Paid for this operation.");
  });

  it("does not show customer identity", async () => {
    renderWithClients(<OrderDetailView id={order().id} />, fakeClients({ order: vi.fn().mockResolvedValue(order()), paymentFor: vi.fn().mockResolvedValue(payment()) }));
    await screen.findByText("Widget");
    expect(screen.queryByText("c1")).not.toBeInTheDocument();
  });
});
