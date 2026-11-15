"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@ecommerce/api-client";
import { useAdminOrder, useAdminPayment, useAdminPayments, useRefundPayment, useSettlePayment } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { dateTime, money, shortId } from "../../components/format";
import { ConfirmDialog } from "../../components/modal";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { settled } from "../../components/safe";
import { Pagination } from "../../components/pagination";
import { StatusBadge } from "../../components/status-badge";
import { canRefund, canSettle } from "../orders/actions";
import { refundSchema, settlementSchema, type RefundForm, type SettlementForm } from "./schema";

export function PaymentsView() {
  const [page, setPage] = useState(1);
  const query = useAdminPayments({ page, size: 20 });
  return (
    <>
      <header className="page-header"><h1>Payments</h1></header>
      <p className="muted">Settlements and refunds are recorded manually from bank evidence; nothing here moves money. To record a settlement, open the order.</p>
      <QueryState query={query} isEmpty={(d) => d.items.length === 0} empty="No payments have been recorded.">
        {(data) => (
          <>
            <table className="data-table">
              <thead><tr><th>Order</th><th>Amount</th><th>Reference</th><th>Settled</th><th>Status</th></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/payments/${p.orderId}`}>{shortId(p.orderId)}</Link></td>
                    <td>{money(p.amount)}</td><td>{p.reference}</td><td>{dateTime(p.settledAt)}</td>
                    <td><StatusBadge value={p.refundReference ? "Refunded" : "Paid"} /></td>
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

function SettlementPanel({ orderId, total }: { orderId: string; total: { amount: number; currency: string } }) {
  const settle = useSettlePayment();
  const form = useForm<SettlementForm>({ resolver: zodResolver(settlementSchema), defaultValues: { amount: total.amount, currency: total.currency, reference: "" } });
  const errors = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit((v) => settled(settle.mutateAsync({ orderId, ...v })))} noValidate className="form-card">
      <h2>Record bank settlement</h2>
      <p className="muted">The amount must equal the order total ({money(total)}); the backend rejects anything else.</p>
      <Field label="Amount" error={errors.amount?.message}>{(id, d) => <Input id={id} type="number" step="any" aria-describedby={d} {...form.register("amount", { valueAsNumber: true })} />}</Field>
      <Field label="Currency" error={errors.currency?.message}>{(id, d) => <Input id={id} maxLength={3} aria-describedby={d} {...form.register("currency")} />}</Field>
      <Field label="Bank reference" error={errors.reference?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("reference")} />}</Field>
      {settle.error ? <ErrorNotice error={settle.error} /> : null}
      <Button type="submit" disabled={settle.isPending}>Record settlement</Button>
    </form>
  );
}

function RefundPanel({ orderId }: { orderId: string }) {
  const refund = useRefundPayment();
  const [confirming, setConfirming] = useState(false);
  const form = useForm<RefundForm>({ resolver: zodResolver(refundSchema), defaultValues: { reference: "" } });
  return (
    <>
      <form onSubmit={form.handleSubmit(() => setConfirming(true))} noValidate className="form-card">
        <h2>Record refund</h2>
        <p className="muted">Refunds are financial only. Returned goods are not restocked automatically.</p>
        <Field label="Refund reference" error={form.formState.errors.reference?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("reference")} />}</Field>
        <Button type="submit" className="danger">Record refund</Button>
      </form>
      <ConfirmDialog open={confirming} title="Record refund" message="This marks the order as refunded and cannot be undone." confirmLabel="Record refund"
        pending={refund.isPending} error={refund.error ? <ErrorNotice error={refund.error} /> : null}
        onCancel={() => setConfirming(false)}
        onConfirm={() => refund.mutate({ orderId, reference: form.getValues("reference") }, { onSuccess: () => setConfirming(false) })} />
    </>
  );
}

export function PaymentDetailView({ orderId }: { orderId: string }) {
  const order = useAdminOrder(orderId);
  const payment = useAdminPayment(orderId);
  const missing = payment.error instanceof ApiError && payment.error.kind === "not-found";
  return (
    <>
      <header className="page-header"><h1>Payment · order {shortId(orderId)}</h1></header>
      <p><Link href={`/orders/${orderId}`}>Back to order</Link></p>
      <QueryState query={order}>
        {(o) => (
          <>
            {payment.data ? (
              <dl className="summary">
                <div><dt>Amount</dt><dd>{money(payment.data.amount)}</dd></div>
                <div><dt>Reference</dt><dd>{payment.data.reference}</dd></div>
                <div><dt>Recorded by</dt><dd>{shortId(payment.data.recordedBy)}</dd></div>
                <div><dt>Settled at</dt><dd>{dateTime(payment.data.settledAt)}</dd></div>
                {payment.data.refundReference ? (
                  <>
                    <div><dt>Refund reference</dt><dd>{payment.data.refundReference}</dd></div>
                    <div><dt>Refunded by</dt><dd>{payment.data.refundedBy ? shortId(payment.data.refundedBy) : "—"}</dd></div>
                    <div><dt>Refunded at</dt><dd>{payment.data.refundedAt ? dateTime(payment.data.refundedAt) : "—"}</dd></div>
                  </>
                ) : null}
              </dl>
            ) : payment.error && !missing ? <ErrorNotice error={payment.error} /> : <p className="muted">No payment has been recorded for this order.</p>}
            {canSettle(o, payment.data) ? <SettlementPanel orderId={orderId} total={o.total} /> : null}
            {canRefund(o, payment.data) ? <RefundPanel orderId={orderId} /> : null}
          </>
        )}
      </QueryState>
    </>
  );
}
