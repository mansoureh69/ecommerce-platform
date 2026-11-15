import type { Cart, Money } from "@ecommerce/api-contracts";

const currencyDigits: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  IRR: 0,
  JPY: 0,
  KWD: 3,
};

export function formatMoney(money: Money, locale: string): string {
  const digits = currencyDigits[money.currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(money.amount);
}

export function cartQuantity(cart: Cart): number {
  return cart.lines.reduce((total, line) => total + line.quantity, 0);
}

export function validQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 0 && quantity <= 999;
}

export function newCheckoutKey(): string {
  return crypto.randomUUID();
}
