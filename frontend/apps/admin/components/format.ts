import { formatMoney } from "@ecommerce/ecommerce-core";
import type { Money } from "@ecommerce/api-contracts";

export const money = (value: Money) => formatMoney(value, "en-US");
export const dateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
export const shortId = (id: string) => id.slice(0, 8);
