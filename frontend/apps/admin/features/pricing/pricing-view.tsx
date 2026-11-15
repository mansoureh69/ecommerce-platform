"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Money, Product } from "@ecommerce/api-contracts";
import { useAdminProducts, usePrice, useSetPrice } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import { ApiError } from "@ecommerce/api-client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { money } from "../../components/format";
import { Modal } from "../../components/modal";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { settled } from "../../components/safe";
import { Pagination } from "../../components/pagination";
import { priceSchema, type PriceForm } from "./schema";

function PriceCell({ id }: { id: string }) {
  const price = usePrice(id);
  if (price.isPending) return <span className="muted">…</span>;
  if (price.error instanceof ApiError && price.error.kind === "not-found") return <span className="muted">Not set</span>;
  if (price.error) return <span className="muted">Unavailable</span>;
  return <>{money(price.data)}</>;
}

function PriceEditor({ product, onDone }: { product: Product; onDone: () => void }) {
  const current = usePrice(product.id);
  if (current.isPending) return <p aria-busy="true" className="muted">Loading…</p>;
  return <PriceForm product={product} current={current.data} onDone={onDone} />;
}

function PriceForm({ product, current, onDone }: { product: Product; current: Money | undefined; onDone: () => void }) {
  const setPrice = useSetPrice();
  // Blank until a price exists; NaN here would be unequal to itself and loop react-hook-form's reset.
  const form = useForm<PriceForm>({
    resolver: zodResolver(priceSchema),
    defaultValues: { amount: current?.amount as number, currency: current?.currency ?? "" },
  });
  async function submit(values: PriceForm) {
    if (await settled(setPrice.mutateAsync({ id: product.id, ...values }))) onDone();
  }
  const errors = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <p>{product.name} · {product.sku}</p>
      <Field label="Price" error={errors.amount?.message}>{(id, d) => <Input id={id} type="number" step="any" inputMode="decimal" aria-describedby={d} {...form.register("amount", { valueAsNumber: true })} />}</Field>
      <Field label="Currency" error={errors.currency?.message}>{(id, d) => <Input id={id} maxLength={3} aria-describedby={d} {...form.register("currency")} />}</Field>
      {setPrice.error ? <ErrorNotice error={setPrice.error} /> : null}
      <Button type="submit" disabled={setPrice.isPending}>Save price</Button>
    </form>
  );
}

export function PricingView() {
  const [page, setPage] = useState(1);
  const preselect = useSearchParams().get("product");
  const query = useAdminProducts({ page, size: 20, sort: "name" });
  const [editing, setEditing] = useState<Product | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const target = editing ?? (!dismissed ? query.data?.items.find((p) => p.id === preselect) ?? null : null);
  return (
    <>
      <header className="page-header"><h1>Pricing</h1></header>
      <QueryState query={query} isEmpty={(d) => d.items.length === 0} empty="No products to price.">
        {(data) => (
          <>
            <table className="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.sku}</td><td><PriceCell id={p.id} /></td>
                    <td><Button className="secondary" onClick={() => setEditing(p)}>Edit price</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.number} size={data.size} total={data.total} onChange={setPage} />
          </>
        )}
      </QueryState>
      <Modal open={target !== null} title="Update price" onClose={() => { setEditing(null); setDismissed(true); }}>
        {target ? <PriceEditor product={target} onDone={() => { setEditing(null); setDismissed(true); }} /> : null}
      </Modal>
    </>
  );
}
