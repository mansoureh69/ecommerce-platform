import { Badge } from "@ecommerce/ui-primitives";

const tone: Record<string, string> = {
  PendingPayment: "warn", Paid: "info", Shipped: "info", Delivered: "ok", Cancelled: "neutral", Refunded: "neutral",
  Active: "ok", Inactive: "neutral", Published: "ok", Draft: "warn",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge className={`tone-${tone[value] ?? "neutral"}`}>{value}</Badge>;
}
