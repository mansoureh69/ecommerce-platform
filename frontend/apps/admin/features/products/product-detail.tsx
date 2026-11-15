"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@ecommerce/api-contracts";
import { useAdminProduct, useCreateVariant, useDeleteVariant, useSetProductState, useUpdateVariant } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "../../components/modal";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { settled } from "../../components/safe";
import { StatusBadge } from "../../components/status-badge";
import { ProductFormView } from "./product-form";
import { ProductImages } from "./product-images";
import { formatAttributes, parseAttributes, variantSchema, type VariantForm } from "./schema";

function AddVariant({ product }: { product: Product }) {
  const create = useCreateVariant();
  const form = useForm<VariantForm>({ resolver: zodResolver(variantSchema), defaultValues: { sku: "", name: "", attributes: "" } });
  async function submit(values: VariantForm) {
    const created = await settled(create.mutateAsync({ id: product.id, input: { sku: values.sku, name: values.name, attributes: parseAttributes(values.attributes) ?? {} } }));
    if (created) form.reset();
  }
  const errors = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="form-card">
      <h3>Add variant</h3>
      <Field label="Variant SKU" error={errors.sku?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("sku")} />}</Field>
      <Field label="Variant name" error={errors.name?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("name")} />}</Field>
      <Field label="Attributes (Name=Value per line)" error={errors.attributes?.message}>{(id, d) => <textarea id={id} aria-describedby={d} className="ui-input" rows={3} {...form.register("attributes")} />}</Field>
      {create.error ? <ErrorNotice error={create.error} /> : null}
      <Button type="submit" disabled={create.isPending}>Add variant</Button>
    </form>
  );
}

function Variants({ product }: { product: Product }) {
  const update = useUpdateVariant();
  const remove = useDeleteVariant();
  const [removing, setRemoving] = useState<string | null>(null);
  const target = product.variants?.find((v) => v.id === removing);
  return (
    <section aria-labelledby="variants-title">
      <h2 id="variants-title">Variants and SKUs</h2>
      {product.variants?.length ? (
        <table className="data-table">
          <thead><tr><th>SKU</th><th>Name</th><th>Attributes</th><th>State</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {product.variants.map((v) => (
              <tr key={v.id}>
                <td>{v.sku}</td><td>{v.name}</td><td>{formatAttributes(v.attributes).replaceAll("\n", ", ")}</td>
                <td><StatusBadge value={v.active ? "Active" : "Inactive"} /></td>
                <td>
                  <Button className="secondary" disabled={update.isPending}
                    onClick={() => update.mutate({ id: product.id, variantId: v.id, input: { sku: v.sku, name: v.name, active: !v.active, attributes: Object.fromEntries(v.attributes.map((a) => [a.name, a.value])) } })}>
                    {v.active ? "Deactivate" : "Activate"}
                  </Button>{" "}
                  <Button className="danger" onClick={() => setRemoving(v.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">No variants.</p>}
      {update.error ? <ErrorNotice error={update.error} /> : null}
      <AddVariant product={product} />
      <ConfirmDialog open={Boolean(target)} title="Delete variant" message={`Delete variant ${target?.sku ?? ""}? This cannot be undone.`} confirmLabel="Delete variant"
        pending={remove.isPending} error={remove.error ? <ErrorNotice error={remove.error} /> : null}
        onCancel={() => setRemoving(null)}
        onConfirm={() => target && remove.mutate({ id: product.id, variantId: target.id }, { onSuccess: () => setRemoving(null) })} />
    </section>
  );
}

export function ProductDetailView({ id }: { id: string }) {
  const query = useAdminProduct(id);
  const state = useSetProductState();
  return (
    <QueryState query={query}>
      {(product) => (
        <>
          <header className="page-header">
            <h1>{product.name}</h1>
            <div>
              <StatusBadge value={product.active ? "Active" : "Inactive"} /> <StatusBadge value={product.published ? "Published" : "Draft"} />
            </div>
          </header>
          <p className="actions">
            <Button className="secondary" disabled={state.isPending} onClick={() => state.mutate({ id, input: { active: !product.active } })}>{product.active ? "Deactivate" : "Activate"}</Button>
            <Button className="secondary" disabled={state.isPending} onClick={() => state.mutate({ id, input: { published: !product.published } })}>{product.published ? "Unpublish" : "Publish"}</Button>
            <Link className="ui-button secondary" href={`/pricing?product=${id}`}>Price</Link>
            <Link className="ui-button secondary" href={`/inventory/${id}`}>Stock</Link>
          </p>
          {state.error ? <ErrorNotice error={state.error} /> : null}
          <ProductFormView product={product} />
          <Variants product={product} />
          <ProductImages product={product} />
        </>
      )}
    </QueryState>
  );
}
