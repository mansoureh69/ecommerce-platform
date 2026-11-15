"use client";

import { formatMoney } from "@ecommerce/ecommerce-core";
import {
  useCart,
  useCartLineDetails,
  useSession,
  useSetCartLine,
} from "@ecommerce/ecommerce-hooks";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../i18n/config";

interface CartCopy {
  loading: string;
  error: string;
  empty: string;
  continue: string;
  item: string;
  quantity: string;
  price: string;
  subtotal: string;
  subtotalNote: string;
  remove: string;
  updating: string;
  updateError: string;
  checkout: string;
  mixedCurrency: string;
  signInTitle: string;
  signInBody: string;
  signIn: string;
}

export function CartView({ locale, copy }: { locale: Locale; copy: CartCopy }) {
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const cart = useCart(authenticated);
  const details = useCartLineDetails(
    cart.data?.lines.map((line) => line.productId) ?? [],
  );
  const setLine = useSetCartLine();

  if (session.isPending)
    return (
      <p className="commerce-state" aria-live="polite">
        {copy.loading}
      </p>
    );
  if (!authenticated)
    return (
      <section className="empty-panel">
        <h2>{copy.signInTitle}</h2>
        <p>{copy.signInBody}</p>
        <Link
          className="ui-button"
          href={`/${locale}/login?returnTo=/${locale}/cart`}
        >
          {copy.signIn}
        </Link>
      </section>
    );
  if (cart.isPending)
    return (
      <p className="commerce-state" aria-live="polite">
        {copy.loading}
      </p>
    );
  if (cart.isError)
    return (
      <p className="commerce-state" role="alert">
        {copy.error}
      </p>
    );
  if (!cart.data.lines.length)
    return (
      <section className="empty-panel">
        <h2>{copy.empty}</h2>
        <Link className="ui-button" href={`/${locale}/products`}>
          {copy.continue}
        </Link>
      </section>
    );

  const priced = details.map((detail, index) => ({
    detail,
    line: cart.data.lines[index],
  }));
  const currencies = new Set(
    priced.map(({ detail }) => detail.price.data?.currency).filter(Boolean),
  );
  const allPriced = priced.every(({ detail }) => Boolean(detail.price.data));
  const mixedCurrency = currencies.size > 1;
  const subtotal =
    allPriced && !mixedCurrency
      ? priced.reduce(
          (total, { detail, line }) =>
            total + (detail.price.data?.amount ?? 0) * line.quantity,
          0,
        )
      : null;
  const currency = priced.find(({ detail }) => detail.price.data)?.detail.price
    .data?.currency;

  return (
    <div className="cart-layout">
      <section className="cart-lines" aria-label={copy.item}>
        {priced.map(({ detail, line }) => {
          const product = detail.product.data;
          const image =
            product?.images?.find((item) => item.isPrimary) ??
            product?.images?.[0];
          return (
            <article className="cart-line" key={line.productId}>
              <div className="cart-line-image">
                {image ? (
                  <Image
                    src={image.thumbnailUrl}
                    alt={image.altText || product?.name || ""}
                    width={160}
                    height={160}
                  />
                ) : null}
              </div>
              <div className="cart-line-copy">
                <h2>{product?.name ?? copy.loading}</h2>
                <p>
                  {detail.price.data
                    ? formatMoney(detail.price.data, locale)
                    : copy.error}
                </p>
                <div className="cart-line-actions">
                  <label htmlFor={`quantity-${line.productId}`}>
                    {copy.quantity}
                  </label>
                  <select
                    id={`quantity-${line.productId}`}
                    className="ui-select"
                    value={line.quantity}
                    disabled={setLine.isPending}
                    onChange={(event) =>
                      setLine.mutate({
                        productId: line.productId,
                        quantity: Number(event.target.value),
                      })
                    }
                  >
                    {Array.from(
                      new Set([
                        ...Array.from({ length: 20 }, (_, index) => index + 1),
                        line.quantity,
                      ]),
                    )
                      .sort((a, b) => a - b)
                      .map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="text-button danger"
                    disabled={setLine.isPending}
                    onClick={() =>
                      setLine.mutate({ productId: line.productId, quantity: 0 })
                    }
                  >
                    {copy.remove}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {setLine.isPending ? (
          <p className="form-note" role="status">
            {copy.updating}
          </p>
        ) : null}
        {setLine.isError ? (
          <p className="form-error" role="alert">
            {copy.updateError}
          </p>
        ) : null}
      </section>
      <aside className="cart-summary">
        <h2>{copy.subtotal}</h2>
        <p className="summary-total">
          {subtotal !== null && currency
            ? formatMoney({ amount: subtotal, currency }, locale)
            : "—"}
        </p>
        <p>{copy.subtotalNote}</p>
        {mixedCurrency ? (
          <p className="form-error" role="alert">
            {copy.mixedCurrency}
          </p>
        ) : null}
        <Link
          className={`ui-button ${mixedCurrency || !allPriced ? "is-disabled" : ""}`}
          href={
            mixedCurrency || !allPriced
              ? `/${locale}/cart`
              : `/${locale}/checkout`
          }
          aria-disabled={mixedCurrency || !allPriced}
        >
          {copy.checkout}
        </Link>
        <Link className="secondary-link" href={`/${locale}/products`}>
          {copy.continue}
        </Link>
      </aside>
    </div>
  );
}
