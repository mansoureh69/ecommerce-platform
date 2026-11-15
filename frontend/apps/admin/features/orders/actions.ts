import type { AdminPayment, Order, OrderStatus } from "@ecommerce/api-contracts";
import type { OrderAction } from "@ecommerce/ecommerce-hooks";

export const orderStatuses: OrderStatus[] = ["PendingPayment", "Paid", "Shipped", "Delivered", "Cancelled", "Refunded"];

// Mirrors the backend lifecycle (PendingPayment -> Paid -> Shipped -> Delivered); the API still enforces it.
const transitions: Partial<Record<string, OrderAction>> = { PendingPayment: "cancel", Paid: "ship", Shipped: "deliver" };

export const allowedOrderAction = (order: Pick<Order, "status">): OrderAction | null => transitions[order.status] ?? null;
export const canSettle = (order: Pick<Order, "status">, payment: AdminPayment | undefined) => order.status === "PendingPayment" && !payment;
export const canRefund = (order: Pick<Order, "status">, payment: AdminPayment | undefined) => order.status === "Paid" && !!payment && !payment.refundReference;
