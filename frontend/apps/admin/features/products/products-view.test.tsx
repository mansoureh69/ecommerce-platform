import { ApiError } from "@ecommerce/api-client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { router } from "../../test/setup";
import { fakeClients, renderWithClients } from "../../test/render";
import { ProductFormView } from "./product-form";
import { ProductsView } from "./products-view";

const product = { id: "p1", sku: "SKU-1", name: "Widget", description: "d", categoryId: "c1", active: true, published: true, attributes: [], variants: [], images: [] };
const page = (items: unknown[]) => ({ items, number: 1, size: 20, total: items.length });

describe("ProductsView", () => {
  it("lists products, searches and toggles activation", async () => {
    const products = vi.fn().mockResolvedValue(page([product]));
    const setProductState = vi.fn().mockResolvedValue({ ...product, active: false });
    renderWithClients(<ProductsView />, fakeClients({ products, setProductState }));
    expect(await screen.findByRole("link", { name: "Widget" })).toHaveAttribute("href", "/products/p1");
    await userEvent.type(screen.getByLabelText("Search by name or SKU"), "wid{enter}");
    await waitFor(() => expect(products).toHaveBeenLastCalledWith(expect.objectContaining({ search: "wid", page: 1 })));
    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(setProductState).toHaveBeenCalledWith("p1", { active: false }));
  });

  it("shows empty and error states", async () => {
    const { unmount } = renderWithClients(<ProductsView />, fakeClients({ products: vi.fn().mockResolvedValue(page([])) }));
    expect(await screen.findByText("No products match.")).toBeInTheDocument();
    unmount();
    renderWithClients(<ProductsView />, fakeClients({ products: vi.fn().mockRejectedValue(new ApiError("Down", 500, "server")) }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Down");
  });
});

describe("ProductFormView", () => {
  const categories = vi.fn().mockResolvedValue([{ id: "c1", name: "Tools", description: "" }]);

  it("blocks submission until required fields are valid", async () => {
    const createProduct = vi.fn();
    renderWithClients(<ProductFormView />, fakeClients({ categories, createProduct }));
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByText("SKU is required.")).toBeInTheDocument();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Choose a category.")).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("creates a product and opens it", async () => {
    const createProduct = vi.fn().mockResolvedValue(product);
    renderWithClients(<ProductFormView />, fakeClients({ categories, createProduct }));
    await userEvent.type(screen.getByLabelText("SKU"), "SKU-1");
    await userEvent.type(screen.getByLabelText("Name"), "Widget");
    await screen.findByRole("option", { name: "Tools" });
    await userEvent.selectOptions(screen.getByLabelText("Category"), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ sku: "SKU-1", name: "Widget", categoryId: "c1" })));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/products/p1"));
  });

  it("shows backend validation errors such as a duplicate SKU", async () => {
    const createProduct = vi.fn().mockRejectedValue(new ApiError("SKU already exists.", 409, "conflict"));
    renderWithClients(<ProductFormView />, fakeClients({ categories, createProduct }));
    await userEvent.type(screen.getByLabelText("SKU"), "DUP");
    await userEvent.type(screen.getByLabelText("Name"), "Widget");
    await screen.findByRole("option", { name: "Tools" });
    await userEvent.selectOptions(screen.getByLabelText("Category"), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("SKU already exists.");
  });
});
