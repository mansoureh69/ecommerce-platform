"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@ecommerce/api-contracts";
import { useAdminCategories, useCreateProduct, useUpdateProduct } from "@ecommerce/ecommerce-hooks";
import { Button, Checkbox, Field, Input, Select } from "@ecommerce/ui-primitives";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ErrorNotice } from "../../components/page-state";
import { settled } from "../../components/safe";
import { productSchema, type ProductForm } from "./schema";

export function ProductFormView({ product }: { product?: Product }) {
  const router = useRouter();
  const categories = useAdminCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { sku: product.sku, name: product.name, description: product.description, categoryId: product.categoryId }
      : { sku: "", name: "", description: "", categoryId: "", published: false },
  });
  const error = create.error ?? update.error;
  async function submit(values: ProductForm) {
    if (product) {
      await settled(update.mutateAsync({ id: product.id, input: { sku: values.sku, name: values.name, description: values.description, categoryId: values.categoryId } }));
    } else {
      const created = await settled(create.mutateAsync(values));
      if (created) router.push(`/products/${created.id}`);
    }
  }
  const errors = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="form-card">
      <Field label="SKU" error={errors.sku?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("sku")} />}</Field>
      <Field label="Name" error={errors.name?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("name")} />}</Field>
      <Field label="Description" error={errors.description?.message}>{(id, d) => <textarea id={id} aria-describedby={d} className="ui-input" rows={4} {...form.register("description")} />}</Field>
      <Field label="Category" error={errors.categoryId?.message}>
        {(id, d) => (
          <Select id={id} aria-describedby={d} {...form.register("categoryId")}>
            <option value="">Select a category</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
      </Field>
      {!product ? <label className="inline"><Checkbox {...form.register("published")} /> Publish immediately</label> : null}
      {categories.error ? <ErrorNotice error={categories.error} /> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {update.isSuccess ? <p role="status" className="notice">Saved.</p> : null}
      <Button type="submit" disabled={create.isPending || update.isPending}>{product ? "Save changes" : "Create product"}</Button>
    </form>
  );
}
