"use client";

import { formatMoney } from "@ecommerce/ecommerce-core";
import {
  useCancelOrder,
  useOrder,
  useSession,
} from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import type { Locale } from "../i18n/config";

interface OrderCopy {
  title: string;
  intro: string;
  loading: string;
  error: string;
  number: string;
  status: string;
  total: string;
  items: string;
  quantity: string;
  unitPrice: string;
  pendingPayment: string;
  paid: string;
  shipped: string;
  delivered: string;
  cancelled: string;
  refunded: string;
  cancel: string;
  cancelling: string;
  cancelledMessage: string;
  cancelError: string;
  continue: string;
}

export function OrderDetail({
  id,
  locale,
  copy,
}: {
  id: string;
  locale: Locale;
  copy: OrderCopy;
}) {
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const order = useOrder(authenticated ? id : "");
  const cancel = useCancelOrder();
  if (session.isPending || order.isPending)
    return (
      <p className="commerce-state" aria-live="polite">
        {copy.loading}
      </p>
    );
  if (!authenticated || order.isError || !order.data)
    return (
      <p className="commerce-state" role="alert">
        {copy.error}
      </p>
    );
  const statusLabels: Record<string, string> = {
    PendingPayment: copy.pendingPayment,
    Paid: copy.paid,
    Shipped: copy.shipped,
    Delivered: copy.delivered,
    Cancelled: copy.cancelled,
    Refunded: copy.refunded,
  };
  return (
    <section className="order-panel">
      <header>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>
      <dl className="order-meta">
        <div>
          <dt>{copy.number}</dt>
          <dd>{order.data.id}</dd>
        </div>
        <div>
          <dt>{copy.status}</dt>
          <dd>
            <span
              className={`status-badge status-${order.data.status.toLowerCase()}`}
            >
              {statusLabels[order.data.status] ?? order.data.status}
            </span>
          </dd>
        </div>
        <div>
          <dt>{copy.total}</dt>
          <dd>{formatMoney(order.data.total, locale)}</dd>
        </div>
      </dl>
      <div className="order-lines">
        <h2>{copy.items}</h2>
        {order.data.lines.map((line) => (
          <article key={line.productId}>
            <div>
              <h3>{line.name}</h3>
              <p>
                {copy.quantity}: {line.quantity}
              </p>
            </div>
            <p>
              <span className="sr-only">{copy.unitPrice}: </span>
              {formatMoney(line.unitPrice, locale)}
            </p>
          </article>
        ))}
      </div>
      {order.data.status === "PendingPayment" ? (
        <button
          className="text-button danger order-cancel"
          type="button"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(order.data.id)}
        >
          {cancel.isPending ? copy.cancelling : copy.cancel}
        </button>
      ) : null}
      {order.data.status === "Cancelled" ? (
        <p className="form-note" role="status">
          {copy.cancelledMessage}
        </p>
      ) : null}
      {cancel.isError ? (
        <p className="form-error" role="alert">
          {copy.cancelError}
        </p>
      ) : null}
      <Link className="ui-button" href={`/${locale}/products`}>
        {copy.continue}
      </Link>
    </section>
  );
}
