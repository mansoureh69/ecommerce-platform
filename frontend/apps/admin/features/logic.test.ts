import { describe, expect, it } from "vitest";
import { receiptSchema } from "./inventory/schema";
import { allowedOrderAction, canRefund, canSettle } from "./orders/actions";
import { refundSchema, settlementSchema } from "./payments/schema";
import { priceSchema } from "./pricing/schema";
import { categorySchema } from "./categories/schema";
import { formatAttributes, parseAttributes, productSchema, variantSchema } from "./products/schema";

const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) => result.error?.issues.map((i) => i.message) ?? [];

describe("product forms", () => {
  it("requires SKU, name and category", () => {
    expect(messages(productSchema.safeParse({ sku: " ", name: "", description: "", categoryId: "" }))).toEqual(
      expect.arrayContaining(["SKU is required.", "Name is required.", "Choose a category."]),
    );
    expect(productSchema.safeParse({ sku: "A", name: "B", description: "", categoryId: "c" }).success).toBe(true);
  });

  it("parses variant attributes and rejects malformed lines", () => {
    expect(parseAttributes("Size=L\n Color = Red \n")).toEqual({ Size: "L", Color: "Red" });
    expect(parseAttributes("")).toEqual({});
    expect(parseAttributes("Size")).toBeNull();
    expect(parseAttributes("=L")).toBeNull();
    expect(parseAttributes("Size=")).toBeNull();
    expect(variantSchema.safeParse({ sku: "V", name: "N", attributes: "bad" }).success).toBe(false);
    expect(formatAttributes([{ name: "Size", value: "L" }])).toBe("Size=L");
  });

  it("requires a category name", () => {
    expect(categorySchema.safeParse({ name: " ", description: "" }).success).toBe(false);
  });
});

describe("pricing and inventory forms", () => {
  it("accepts a positive price and normalizes the currency", () => {
    expect(priceSchema.parse({ amount: 9.5, currency: " usd " })).toEqual({ amount: 9.5, currency: "USD" });
  });

  it("rejects zero, NaN and malformed currency", () => {
    expect(priceSchema.safeParse({ amount: 0, currency: "USD" }).success).toBe(false);
    expect(messages(priceSchema.safeParse({ amount: Number.NaN, currency: "USD" }))).toEqual(["Enter a price."]);
    expect(priceSchema.safeParse({ amount: 1, currency: "US" }).success).toBe(false);
  });

  it("requires a whole positive quantity", () => {
    expect(receiptSchema.safeParse({ quantity: 5 }).success).toBe(true);
    expect(receiptSchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(receiptSchema.safeParse({ quantity: 1.5 }).success).toBe(false);
    expect(receiptSchema.safeParse({ quantity: Number.NaN }).success).toBe(false);
  });
});

describe("payment forms", () => {
  it("requires a bank reference of at most 200 characters", () => {
    expect(settlementSchema.safeParse({ amount: 1, currency: "USD", reference: " " }).success).toBe(false);
    expect(refundSchema.safeParse({ reference: "x".repeat(201) }).success).toBe(false);
    expect(refundSchema.safeParse({ reference: "refund-1" }).success).toBe(true);
  });
});

describe("order lifecycle actions", () => {
  it("offers only the transition the backend allows", () => {
    expect(allowedOrderAction({ status: "PendingPayment" })).toBe("cancel");
    expect(allowedOrderAction({ status: "Paid" })).toBe("ship");
    expect(allowedOrderAction({ status: "Shipped" })).toBe("deliver");
    for (const status of ["Delivered", "Cancelled", "Refunded"]) expect(allowedOrderAction({ status })).toBeNull();
  });

  const payment = { refundReference: null } as never;
  it("settles only unpaid orders and refunds only paid, unrefunded ones", () => {
    expect(canSettle({ status: "PendingPayment" }, undefined)).toBe(true);
    expect(canSettle({ status: "Paid" }, undefined)).toBe(false);
    expect(canRefund({ status: "Paid" }, payment)).toBe(true);
    expect(canRefund({ status: "Paid" }, { refundReference: "r" } as never)).toBe(false);
    expect(canRefund({ status: "Shipped" }, payment)).toBe(false);
    expect(canRefund({ status: "Paid" }, undefined)).toBe(false);
  });
});
