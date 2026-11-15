import type {
  AdminOrderQuery,
  AdminPayment,
  AdminProductQuery,
  PageQuery,
  StockSummary,
  Cart,
  Category,
  CategoryInput,
  CheckoutInput,
  CreateProductInput,
  Credentials,
  Guid,
  Money,
  Order,
  Page,
  Payment,
  Product,
  ProductStateInput,
  PublicProductQuery,
  RefundInput,
  Session,
  SettlementInput,
  VariantInput,
  VariantUpdateInput,
  ProductVariant,
  ProductImage,
  ProductInput,
} from "@ecommerce/api-contracts";
import { HttpClient, type ApiClientOptions } from "./client";

export { ApiError, type ApiErrorKind } from "./errors";
export { HttpClient, type ApiClientOptions, type RequestOptions } from "./client";

function queryString<T extends object>(values: T): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

export class CommerceApi {
  constructor(
    private readonly http: HttpClient,
    private readonly apiRoot: string,
  ) {}

  private normalizeProduct(product: Product): Product {
    const mediaRoot = `${this.apiRoot.replace(/\/$/, "")}/media/`;
    return {
      ...product,
      images: product.images?.map((image) => ({
        ...image,
        url: image.url.replace(/^\/api\/media\//, mediaRoot),
        thumbnailUrl: image.thumbnailUrl.replace(/^\/api\/media\//, mediaRoot),
      })) ?? null,
    };
  }

  categories = () => this.http.request<Category[]>("/categories");
  products = async (query: PublicProductQuery = {}) => {
    const page = await this.http.request<Page<Product>>(`/products${queryString(query)}`);
    return { ...page, items: page.items.map((product) => this.normalizeProduct(product)) };
  };
  product = async (id: Guid) => this.normalizeProduct(await this.http.request<Product>(`/products/${id}`));
  price = (id: Guid) => this.http.request<Money>(`/products/${id}/price`);

  cart = () => this.http.request<Cart>("/cart");
  setCartLine = (productId: Guid, quantity: number) =>
    this.http.request<Cart>(`/cart/lines/${productId}`, {
      method: "PUT",
      body: { quantity },
    });

  checkout = (input: CheckoutInput) =>
    this.http.request<Order>("/orders", { method: "POST", body: input });
  order = (id: Guid) => this.http.request<Order>(`/orders/${id}`);
  cancelOrder = (id: Guid) =>
    this.http.request<Order>(`/orders/${id}/cancel`, { method: "POST" });
  payment = (orderId: Guid) =>
    this.http.request<Payment>(`/orders/${orderId}/payment`);

  admin = {
    categories: () => this.http.request<Category[]>("/admin/categories"),
    createCategory: (input: CategoryInput) =>
      this.http.request<Category>("/admin/categories", { method: "POST", body: input }),
    updateCategory: (id: Guid, input: CategoryInput) =>
      this.http.request<Category>(`/admin/categories/${id}`, { method: "PUT", body: input }),
    products: async (query: AdminProductQuery = {}) => {
      const page = await this.http.request<Page<Product>>(`/admin/products${queryString(query)}`);
      return { ...page, items: page.items.map((product) => this.normalizeProduct(product)) };
    },
    product: async (id: Guid) => this.normalizeProduct(await this.http.request<Product>(`/admin/products/${id}`)),
    createProduct: (input: CreateProductInput) =>
      this.http.request<Product>("/admin/products", { method: "POST", body: input }).then((product) => this.normalizeProduct(product)),
    updateProduct: (id: Guid, input: ProductInput) =>
      this.http.request<Product>(`/admin/products/${id}`, { method: "PUT", body: input }).then((product) => this.normalizeProduct(product)),
    setProductState: (id: Guid, input: ProductStateInput) =>
      this.http.request<Product>(`/admin/products/${id}/state`, { method: "PUT", body: input }).then((product) => this.normalizeProduct(product)),
    setProductAttributes: (id: Guid, attributes: Record<string, string>) =>
      this.http.request<Product>(`/admin/products/${id}/attributes`, {
        method: "PUT",
        body: { attributes },
      }),
    createVariant: (id: Guid, input: VariantInput) =>
      this.http.request<ProductVariant>(`/admin/products/${id}/variants`, {
        method: "POST",
        body: input,
      }),
    updateVariant: (id: Guid, variantId: Guid, input: VariantUpdateInput) =>
      this.http.request<ProductVariant>(`/admin/products/${id}/variants/${variantId}`, {
        method: "PUT",
        body: input,
      }),
    deleteVariant: (id: Guid, variantId: Guid) =>
      this.http.request<void>(`/admin/products/${id}/variants/${variantId}`, {
        method: "DELETE",
      }),
    images: (id: Guid) =>
      this.http.request<ProductImage[]>(`/admin/products/${id}/images`),
    uploadImage: (id: Guid, file: File, altText: string) => {
      const body = new FormData();
      body.set("file", file);
      body.set("altText", altText);
      return this.http.request<ProductImage>(`/admin/products/${id}/images`, {
        method: "POST",
        body,
      });
    },
    updateImage: (id: Guid, imageId: Guid, altText: string, file?: File) => {
      const body = new FormData();
      if (file) body.set("file", file);
      body.set("altText", altText);
      return this.http.request<ProductImage>(`/admin/products/${id}/images/${imageId}`, {
        method: "PUT",
        body,
      });
    },
    deleteImage: (id: Guid, imageId: Guid) =>
      this.http.request<void>(`/admin/products/${id}/images/${imageId}`, { method: "DELETE" }),
    reorderImages: (id: Guid, imageIds: Guid[]) =>
      this.http.request<ProductImage[]>(`/admin/products/${id}/images/reorder`, {
        method: "PUT",
        body: { imageIds },
      }),
    setPrimaryImage: (id: Guid, imageId: Guid) =>
      this.http.request<ProductImage[]>(`/admin/products/${id}/images/${imageId}/primary`, {
        method: "PUT",
      }),
    setPrice: (id: Guid, amount: number, currency: string) =>
      this.http.request<Money>(`/products/${id}/price`, {
        method: "PUT",
        body: { amount, currency },
      }),
    stock: (id: Guid) => this.http.request<number>(`/inventory/${id}`),
    receiveStock: (id: Guid, quantity: number) =>
      this.http.request<number>(`/inventory/${id}/receipts`, {
        method: "POST",
        body: { quantity },
      }),
    orders: (query: AdminOrderQuery = {}) =>
      this.http.request<Page<Order>>(`/admin/orders${queryString(query)}`),
    order: (id: Guid) => this.http.request<Order>(`/admin/orders/${id}`),
    cancelOrder: (id: Guid) =>
      this.http.request<Order>(`/admin/orders/${id}/cancel`, { method: "POST" }),
    payments: (query: PageQuery = {}) =>
      this.http.request<Page<AdminPayment>>(`/admin/payments${queryString(query)}`),
    paymentFor: (orderId: Guid) =>
      this.http.request<AdminPayment>(`/admin/payments/${orderId}`),
    stockList: (query: PageQuery = {}) =>
      this.http.request<Page<StockSummary>>(`/admin/inventory${queryString(query)}`),
    stockDetail: (productId: Guid) =>
      this.http.request<StockSummary>(`/admin/inventory/${productId}`),
    shipOrder: (id: Guid) =>
      this.http.request<Order>(`/orders/${id}/ship`, { method: "POST" }),
    deliverOrder: (id: Guid) =>
      this.http.request<Order>(`/orders/${id}/deliver`, { method: "POST" }),
    settlePayment: (input: SettlementInput) =>
      this.http.request<Payment>("/payments/manual-settlements", {
        method: "POST",
        body: input,
      }),
    refundPayment: (input: RefundInput) =>
      this.http.request<Payment>("/payments/manual-refunds", {
        method: "POST",
        body: input,
      }),
  };
}

export function createCommerceApi(options: ApiClientOptions): CommerceApi {
  return new CommerceApi(new HttpClient(options), options.baseUrl);
}

export interface SessionClient {
  login(credentials: Credentials): Promise<Session>;
  register(credentials: Credentials): Promise<Session>;
  logout(): Promise<void>;
  session(): Promise<Session>;
}

async function sessionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw await import("./errors").then(({ responseError }) => responseError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function createSessionClient(baseUrl = "/api/auth"): SessionClient {
  return {
    login: (credentials) =>
      sessionRequest<Session>(`${baseUrl}/login`, {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    register: (credentials) =>
      sessionRequest<Session>(`${baseUrl}/register`, {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    logout: () => sessionRequest<void>(`${baseUrl}/logout`, { method: "POST" }),
    session: () => sessionRequest<Session>(`${baseUrl}/session`),
  };
}
