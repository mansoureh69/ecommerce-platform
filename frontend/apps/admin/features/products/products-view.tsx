"use client";

import { useAdminProducts, useSetProductState } from "@ecommerce/ecommerce-hooks";
import { Button, Input, Select } from "@ecommerce/ui-primitives";
import Link from "next/link";
import { useState } from "react";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { Pagination } from "../../components/pagination";
import { StatusBadge } from "../../components/status-badge";

const SIZE = 20;

export function ProductsView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [state, setState] = useState("");
  const query = useAdminProducts({
    page, size: SIZE, search: term || undefined,
    active: state === "active" ? true : state === "inactive" ? false : undefined,
    published: state === "draft" ? false : undefined,
    sort: "newest",
  });
  const toggle = useSetProductState();
  return (
    <>
      <header className="page-header">
        <h1>Products</h1>
        <Link className="ui-button" href="/products/new">New product</Link>
      </header>
      <form className="filters" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(search.trim()); }}>
        <Input aria-label="Search by name or SKU" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select aria-label="State" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Unpublished</option>
        </Select>
        <Button type="submit">Search</Button>
      </form>
      {toggle.error ? <ErrorNotice error={toggle.error} /> : null}
      <QueryState query={query} isEmpty={(d) => d.items.length === 0} empty="No products match.">
        {(data) => (
          <>
            <table className="data-table">
              <thead><tr><th>Name</th><th>SKU</th><th>State</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/products/${p.id}`}>{p.name}</Link></td>
                    <td>{p.sku}</td>
                    <td><StatusBadge value={p.active ? "Active" : "Inactive"} /> <StatusBadge value={p.published ? "Published" : "Draft"} /></td>
                    <td>
                      <Button className="secondary" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: p.id, input: { active: !p.active } })}>
                        {p.active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
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
