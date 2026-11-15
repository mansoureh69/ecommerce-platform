"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Category } from "@ecommerce/api-contracts";
import { useAdminCategories, useCreateCategory, useUpdateCategory } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "../../components/modal";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { settled } from "../../components/safe";
import { categorySchema, type CategoryForm } from "./schema";

function CategoryEditor({ category, onDone }: { category?: Category; onDone: () => void }) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", description: category?.description ?? "" },
  });
  async function submit(values: CategoryForm) {
    const saved = await settled(category ? update.mutateAsync({ id: category.id, input: values }) : create.mutateAsync(values));
    if (saved) onDone();
  }
  const errors = form.formState.errors;
  const error = create.error ?? update.error;
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Field label="Name" error={errors.name?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("name")} />}</Field>
      <Field label="Description" error={errors.description?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...form.register("description")} />}</Field>
      {error ? <ErrorNotice error={error} /> : null}
      <Button type="submit" disabled={create.isPending || update.isPending}>{category ? "Save category" : "Create category"}</Button>
    </form>
  );
}

export function CategoriesView() {
  const query = useAdminCategories();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  return (
    <>
      <header className="page-header">
        <h1>Categories</h1>
        <Button onClick={() => setEditing("new")}>New category</Button>
      </header>
      <QueryState query={query} isEmpty={(d) => d.length === 0} empty="No categories yet. Create one before adding products.">
        {(categories) => (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Description</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td><td>{c.description}</td>
                  <td><Button className="secondary" onClick={() => setEditing(c)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </QueryState>
      <Modal open={editing !== null} title={editing === "new" ? "New category" : "Edit category"} onClose={() => setEditing(null)}>
        {editing !== null ? <CategoryEditor category={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </>
  );
}
