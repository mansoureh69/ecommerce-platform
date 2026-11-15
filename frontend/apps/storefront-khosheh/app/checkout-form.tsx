"use client";

import type {
  CheckoutInput,
  ShippingAddressInput,
} from "@ecommerce/api-contracts";
import { ApiError } from "@ecommerce/api-client";
import { newCheckoutKey } from "@ecommerce/ecommerce-core";
import { useCart, useCheckout, useSession } from "@ecommerce/ecommerce-hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Locale } from "../i18n/config";

interface CheckoutCopy {
  intro: string;
  recipient: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  required: string;
  tooLong: string;
  summary: string;
  items: string;
  total: string;
  placeOrder: string;
  placing: string;
  empty: string;
  backToBag: string;
  signInTitle: string;
  signInBody: string;
  signIn: string;
  conflict: string;
  unavailable: string;
  error: string;
  errorSummary: string;
}

function schema(copy: CheckoutCopy) {
  const field = (max: number) =>
    z.string().trim().min(1, copy.required).max(max, copy.tooLong);
  return z.object({
    recipient: field(200),
    street: field(200),
    city: field(100),
    postalCode: field(30),
    country: field(100),
  });
}

export function CheckoutForm({
  locale,
  copy,
}: {
  locale: Locale;
  copy: CheckoutCopy;
}) {
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const cart = useCart(authenticated);
  const checkout = useCheckout();
  const router = useRouter();
  const attempt = useRef<{ signature: string; input: CheckoutInput } | null>(
    null,
  );
  const form = useForm<ShippingAddressInput>({
    resolver: zodResolver(schema(copy)),
    defaultValues: {
      recipient: "",
      street: "",
      city: "",
      postalCode: "",
      country: "",
    },
  });
  const submit = form.handleSubmit((shipping) => {
    if (!cart.data || !cart.data.lines.length) return;
    const signature = JSON.stringify({
      cartVersion: cart.data.version,
      shipping,
    });
    if (!attempt.current || attempt.current.signature !== signature) {
      attempt.current = {
        signature,
        input: {
          idempotencyKey: newCheckoutKey(),
          cartVersion: cart.data.version,
          shipping,
        },
      };
    }
    checkout.mutate(attempt.current.input, {
      onSuccess: (order) => router.push(`/${locale}/orders/${order.id}`),
    });
  });

  if (session.isPending || cart.isPending)
    return (
      <p className="commerce-state" aria-live="polite">
        {copy.intro}
      </p>
    );
  if (!authenticated)
    return (
      <section className="empty-panel">
        <h2>{copy.signInTitle}</h2>
        <p>{copy.signInBody}</p>
        <Link
          className="ui-button"
          href={`/${locale}/login?returnTo=/${locale}/checkout`}
        >
          {copy.signIn}
        </Link>
      </section>
    );
  if (!cart.data?.lines.length)
    return (
      <section className="empty-panel">
        <h2>{copy.empty}</h2>
        <Link className="ui-button" href={`/${locale}/cart`}>
          {copy.backToBag}
        </Link>
      </section>
    );

  const apiError = checkout.error instanceof ApiError ? checkout.error : null;
  const submitError =
    apiError?.kind === "conflict"
      ? copy.conflict
      : apiError?.kind === "domain"
        ? copy.unavailable
        : checkout.isError
          ? copy.error
          : null;
  const fields = [
    ["recipient", copy.recipient, 200, "name"],
    ["street", copy.street, 200, "street-address"],
    ["city", copy.city, 100, "address-level2"],
    ["postalCode", copy.postalCode, 30, "postal-code"],
    ["country", copy.country, 100, "country-name"],
  ] as const;

  return (
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={submit} noValidate>
        <p>{copy.intro}</p>
        {Object.keys(form.formState.errors).length ? (
          <div className="error-summary" role="alert" tabIndex={-1}>
            <strong>{copy.errorSummary}</strong>
          </div>
        ) : null}
        {fields.map(([name, label, maxLength, autoComplete]) => (
          <div className="ui-field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              className="ui-input"
              autoComplete={autoComplete}
              maxLength={maxLength}
              aria-invalid={Boolean(form.formState.errors[name])}
              aria-describedby={
                form.formState.errors[name] ? `${name}-error` : undefined
              }
              {...form.register(name)}
            />
            {form.formState.errors[name] ? (
              <p id={`${name}-error`} role="alert">
                {form.formState.errors[name]?.message}
              </p>
            ) : null}
          </div>
        ))}
        {submitError ? (
          <p className="form-error" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          className="ui-button"
          type="submit"
          disabled={checkout.isPending}
        >
          {checkout.isPending ? copy.placing : copy.placeOrder}
        </button>
      </form>
      <aside className="checkout-summary">
        <h2>{copy.summary}</h2>
        <p>
          <strong>
            {cart.data.lines.reduce((total, line) => total + line.quantity, 0)}
          </strong>{" "}
          {copy.items}
        </p>
        <p>{copy.total}</p>
        <Link className="secondary-link" href={`/${locale}/cart`}>
          {copy.backToBag}
        </Link>
      </aside>
    </div>
  );
}
