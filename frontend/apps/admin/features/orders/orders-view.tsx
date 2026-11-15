"use client";

import type { OrderStatus } from "@ecommerce/api-contracts";
import { useAdminOrder, useAdminOrders, useAdminPayment, useOrderAction } from "@ecommerce/ecommerce-hooks";
import { Button, Select } from "@ecommerce/ui-primitives";
import Link from "next/link";
import { useState } from "react";
import { money, shortId } from "../../components/format";
import { ConfirmDialog } from "../../components/modal";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { Pagination } from "../../components/pagination";
import { StatusBadge } from "../../components/status-badge";
import { allowedOrderAction, canRefund, canSettle, orderStatuses } from "./actions";

export function OrdersView() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const query = useAdminOrders({ page, size: 20, status: status || undefined });
  return (
    <>
      <header className="page-header"><h1>Orders</h1></header>
      <div className="filters">
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ""); setPage(1); }}>
          <option value="">All statuses</option>
          {orderStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <QueryState query={query} isEmpty={(d) => d.items.length === 0} empty="No orders match.">
        {(data) => (
          <>
            <table className="data-table">
              <thead><tr><th>Order</th><th>Status</th><th>Items</th><th>Total</th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/orders/${o.id}`}>{shortId(o.id)}</Link></td>
                    <td><StatusBadge value={o.status} /></td>
                    <td>{o.lines.reduce((n, l) => n + l.quantity, 0)}</td>
                    <td>{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.number} size={data.size} total={data.total} onChange={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}

const labels = { cancel: "Cancel order", ship: "Mark as shipped", deliver: "Mark as delivered" } as const;

export function OrderDetailView({ id }: { id: string }) {
  const query = useAdminOrder(id);
  const payment = useAdminPayment(id);
  const act = useOrderAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <QueryState query={query}>
      {(order) => {
        const action = allowedOrderAction(order);
        const paid = payment.data;
        return (
          <>
            <header className="page-header"><h1>Order {shortId(order.id)}</h1><StatusBadge value={order.status} /></header>
            <table className="data-table">
              <thead><tr><th>Item</th><th>Unit price</th><th>Quantity</th><th>Line total</th></tr></thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.productId}>
                    <td><Link href={`/products/${l.productId}`}>{l.name}</Link></td><td>{money(l.unitPrice)}</td><td>{l.quantity}</td>
                    <td>{money({ amount: l.unitPrice.amount * l.quantity, currency: l.unitPrice.currency })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th colSpan={3}>Total</th><td>{money(order.total)}</td></tr></tfoot>
            </table>
            <section aria-labelledby="payment-title">
              <h2 id="payment-title">Payment</h2>
              {paid ? (
                <p>Settled {money(paid.amount)} · reference {paid.reference}{paid.refundReference ? ` · refunded (${paid.refundReference})` : ""}. <Link href={`/payments/${order.id}`}>Payment details</Link></p>
              ) : <p className="muted">No payment recorded.</p>}
              {canSettle(order, paid) || canRefund(order, paid) ? <Link className="ui-button secondary" href={`/payments/${order.id}`}>{canSettle(order, paid) ? "Record settlement" : "Refund payment"}</Link> : null}
            </section>
            {act.error ? <ErrorNotice error={act.error} /> : null}
            {action ? (
              <p className="actions">
                {action === "cancel"
                  ? <Button className="danger" onClick={() => setConfirming(true)}>{labels.cancel}</Button>
                  : <Button disabled={act.isPending} onClick={() => act.mutate({ id, action })}>{labels[action]}</Button>}
              </p>
            ) : <p className="muted">No further actions: this order is {order.status}.</p>}
            <ConfirmDialog open={confirming} title="Cancel order" message="Cancelling releases the reserved stock. This cannot be undone." confirmLabel="Cancel order"
              pending={act.isPending} onCancel={() => setConfirming(false)}
              onConfirm={() => act.mutate({ id, action: "cancel" }, { onSuccess: () => setConfirming(false) })} />
          </>
        );
      }}
    </QueryState>
  );
}
