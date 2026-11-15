import { ApiError } from "@ecommerce/api-client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeClients, order, renderWithClients } from "../test/render";
import { CategoriesView } from "./categories/categories-view";
import { DashboardView } from "./dashboard/dashboard-view";
import { InventoryView, StockDetailView } from "./inventory/inventory-view";
import { PricingView } from "./pricing/pricing-view";

const page = (items: unknown[], total = items.length) => ({ items, number: 1, size: 20, total });
const product = { id: "p1", sku: "SKU-1", name: "Widget", description: "", categoryId: "c1", active: true, published: true, attributes: [], variants: [], images: [] };

describe("CategoriesView", () => {
  it("shows an empty state, then creates a category", async () => {
    const categories = vi.fn().mockResolvedValue([]);
    const createCategory = vi.fn().mockResolvedValue({ id: "c1", name: "Tools", description: "" });
    renderWithClients(<CategoriesView />, fakeClients({ categories, createCategory }));
    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New category" }));
    await userEvent.click(await screen.findByRole("button", { name: "Create category" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Tools");
    await userEvent.click(screen.getByRole("button", { name: "Create category" }));
    await waitFor(() => expect(createCategory).toHaveBeenCalledWith({ name: "Tools", description: "" }));
  });

  it("edits an existing category", async () => {
    const updateCategory = vi.fn().mockResolvedValue({ id: "c1", name: "Hand tools", description: "" });
    renderWithClients(<CategoriesView />, fakeClients({ categories: vi.fn().mockResolvedValue([{ id: "c1", name: "Tools", description: "" }]), updateCategory }));
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const name = await screen.findByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Hand tools");
    await userEvent.click(screen.getByRole("button", { name: "Save category" }));
    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith("c1", { name: "Hand tools", description: "" }));
  });
});

describe("PricingView", () => {
  it("shows prices, marks unset ones, and updates a price", async () => {
    const price = vi.fn().mockResolvedValue({ amount: 10, currency: "USD" });
    const setPrice = vi.fn().mockResolvedValue({ amount: 12.5, currency: "USD" });
    renderWithClients(<PricingView />, fakeClients({ products: vi.fn().mockResolvedValue(page([product])), setPrice }, { price }));
    expect(await screen.findByText("$10.00")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit price" }));
    const amount = await screen.findByLabelText("Price");
    await userEvent.clear(amount);
    await userEvent.type(amount, "12.5");
    await userEvent.click(screen.getByRole("button", { name: "Save price" }));
    await waitFor(() => expect(setPrice).toHaveBeenCalledWith("p1", 12.5, "USD"));
  });

  it("rejects an invalid price before calling the backend", async () => {
    const setPrice = vi.fn();
    renderWithClients(<PricingView />, fakeClients({ products: vi.fn().mockResolvedValue(page([product])), setPrice }, { price: vi.fn().mockRejectedValue(new ApiError("none", 404, "not-found")) }));
    expect(await screen.findByText("Not set")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit price" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save price" }));
    expect(await screen.findByText("Enter a price.")).toBeInTheDocument();
    expect(setPrice).not.toHaveBeenCalled();
  });
});

describe("Inventory", () => {
  const stock = { productId: "p1", available: 0, reserved: 2, consumed: 1, reservations: [{ orderId: order().id, quantity: 2, state: "Reserved" }] };

  it("lists stock with product names and flags out-of-stock rows", async () => {
    renderWithClients(<InventoryView />, fakeClients({ stockList: vi.fn().mockResolvedValue(page([stock])), products: vi.fn().mockResolvedValue(page([product])) }));
    expect(await screen.findByRole("link", { name: "Widget" })).toBeInTheDocument();
    expect(screen.getByText(/out of stock/)).toBeInTheDocument();
  });

  it("shows reservations and validates the received quantity", async () => {
    const receiveStock = vi.fn().mockResolvedValue(7);
    renderWithClients(<StockDetailView productId="p1" />, fakeClients({ product: vi.fn().mockResolvedValue(product), stockDetail: vi.fn().mockResolvedValue(stock), receiveStock }));
    expect(await screen.findByText("Reserved", { selector: "td" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Receive stock" }));
    expect(await screen.findByText("Enter a quantity.")).toBeInTheDocument();
    expect(receiveStock).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Quantity received"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Receive stock" }));
    await waitFor(() => expect(receiveStock).toHaveBeenCalledWith("p1", 5));
    expect(await screen.findByText(/Available now: 7/)).toBeInTheDocument();
  });
});

describe("DashboardView", () => {
  it("shows real totals from the list endpoints", async () => {
    const orders = vi.fn().mockImplementation(async (q: { status?: string }) => page(q.status === "Paid" ? [order()] : [], q.status === "Paid" ? 4 : 0));
    renderWithClients(<DashboardView />, fakeClients({
      products: vi.fn().mockResolvedValue(page([], 12)), categories: vi.fn().mockResolvedValue([{}, {}]),
      stockList: vi.fn().mockResolvedValue(page([], 9)), orders,
    }));
    const stat = (label: string) => screen.getByText(label).closest(".stat") as HTMLElement;
    await waitFor(() => expect(stat("To ship")).toHaveTextContent("4"));
    expect(stat("Products")).toHaveTextContent("12");
    expect(stat("Categories")).toHaveTextContent("2");
    expect(stat("Products with stock")).toHaveTextContent("9");
  });

  it("surfaces a failing endpoint rather than showing zeros", async () => {
    const down = vi.fn().mockRejectedValue(new ApiError("API down", 500, "server"));
    renderWithClients(<DashboardView />, fakeClients({ products: down, categories: down, stockList: down, orders: down }));
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
  });
});
