export type Guid = string;

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

export interface Page<T> {
  items: T[];
  number: number;
  size: number;
  total: number;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface AuthResult {
  success: boolean;
  token: string | null;
  expiresAt: string | null;
  error: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  authenticated: boolean;
  expiresAt: string | null;
  roles: string[];
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: Guid;
  sku: string;
  name: string;
  active: boolean;
  attributes: ProductAttribute[];
}

export interface ProductImage {
  id: Guid;
  url: string;
  thumbnailUrl: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: Guid;
  sku: string;
  name: string;
  description: string;
  categoryId: Guid;
  active: boolean;
  published: boolean;
  attributes: ProductAttribute[] | null;
  variants: ProductVariant[] | null;
  images: ProductImage[] | null;
}

export interface Category {
  id: Guid;
  name: string;
  description: string;
}

export interface PublicProductQuery {
  page?: number;
  size?: number;
  categoryId?: Guid;
}

export type ProductSort = "name" | "name-desc" | "sku" | "newest";

export interface AdminProductQuery extends PublicProductQuery {
  search?: string;
  active?: boolean;
  published?: boolean;
  sort?: ProductSort;
}

export interface CategoryInput {
  name: string;
  description: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  description: string;
  categoryId: Guid;
}

export interface CreateProductInput extends ProductInput {
  published?: boolean;
}

export interface ProductStateInput {
  active?: boolean;
  published?: boolean;
}

export interface VariantInput {
  sku: string;
  name: string;
  attributes: Record<string, string>;
}

export interface VariantUpdateInput extends VariantInput {
  active: boolean;
}

export interface CartLine {
  productId: Guid;
  quantity: number;
}

export interface Cart {
  version: Guid;
  lines: CartLine[];
}

export interface ShippingAddressInput {
  recipient: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CheckoutInput {
  idempotencyKey: Guid;
  cartVersion: Guid;
  shipping: ShippingAddressInput;
}

export interface OrderLine {
  productId: Guid;
  name: string;
  unitPrice: Money;
  quantity: number;
}

export interface Order {
  id: Guid;
  customerId: Guid;
  status: string;
  total: Money;
  lines: OrderLine[];
}

export interface Payment {
  id: Guid;
  orderId: Guid;
  amount: Money;
  reference: string;
  refundReference: string | null;
}

export interface SettlementInput {
  orderId: Guid;
  amount: number;
  currency: string;
  reference: string;
}

export interface RefundInput {
  orderId: Guid;
  reference: string;
}
