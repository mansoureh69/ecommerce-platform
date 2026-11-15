"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminProduct, useAdminProducts, useAdminStock, useAdminStockList, useReceiveStock } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { shortId } from "../../components/format";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { settled } from "../../components/safe";
import { Pagination } from "../../components/pagination";
import { receiptSchema, type ReceiptForm } from "./schema";

export function InventoryView() {
  const [page, setPage] = useState(1);
  const stock = useAdminStockList({ page, size: 20 });
  const products = useAdminProducts({ size: 100 });
  const names = new Map(products.data?.items.map((p) => [p.id, p.name]));
  return (
    <>
      <header className="page-header"><h1>Inventory</h1></header>
      <p className="muted">Lists products that have a stock record. To start stocking a product, open it and receive stock.</p>
      <QueryState query={stock} isEmpty={(d) => d.items.length === 0} empty="No stock has been received yet.">
        {(data) => (
          <>
            <table className="data-table">
              <thead><tr><th>Product</th><th>Available</th><th>Reserved</th><th>Consumed</th></tr></thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.productId}>
                    <td><Link href={`/inventory/${s.productId}`}>{names.get(s.productId) ?? shortId(s.productId)}</Link></td>
                    <td className={s.available === 0 ? "text-danger" : undefined}>{s.available}{s.available === 0 ? " (out of stock)" : ""}</td>
                    <td>{s.reserved}</td><td>{s.consumed}</td>
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

function ReceiveForm({ productId }: { productId: string }) {
  const receive = useReceiveStock();
  const form = useForm<ReceiptForm>({ resolver: zodResolver(receiptSchema), defaultValues: { quantity: undefined as unknown as number } });
  async function submit(values: ReceiptForm) {
    if (await settled(receive.mutateAsync({ id: productId, quantity: values.quantity }))) form.reset({ quantity: undefined as unknown as number });
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="form-card">
      <h2>Receive stock</h2>
      <Field label="Quantity received" error={form.formState.errors.quantity?.message}>
        {(id, d) => <Input id={id} type="number" step="1" min="1" aria-describedby={d} {...form.register("quantity", { valueAsNumber: true })} />}
      </Field>
      {receive.error ? <ErrorNotice error={receive.error} /> : null}
      {receive.isSuccess ? <p role="status" className="notice">Stock received. Available now: {receive.data}.</p> : null}
      <Button type="submit" disabled={receive.isPending}>Receive stock</Button>
    </form>
  );
}

export function StockDetailView({ productId }: { productId: string }) {
  const product = useAdminProduct(productId);
  const stock = useAdminStock(productId);
  return (
    <>
      <header className="page-header"><h1>Stock{product.data ? ` · ${product.data.name}` : ""}</h1></header>
      <QueryState query={stock}>
        {(s) => (
          <>
            <dl className="summary">
              <div><dt>Available</dt><dd>{s.available}</dd></div>
              <div><dt>Reserved</dt><dd>{s.reserved}</dd></div>
              <div><dt>Consumed</dt><dd>{s.consumed}</dd></div>
            </dl>
            <h2>Reservations</h2>
            {s.reservations.length ? (
              <table className="data-table">
                <thead><tr><th>Order</th><th>Quantity</th><th>State</th></tr></thead>
                <tbody>
                  {s.reservations.map((r) => (
                    <tr key={r.orderId}><td><Link href={`/orders/${r.orderId}`}>{shortId(r.orderId)}</Link></td><td>{r.quantity}</td><td>{r.state}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">No reservations.</p>}
          </>
        )}
      </QueryState>
      <ReceiveForm productId={productId} />
    </>
  );
}
