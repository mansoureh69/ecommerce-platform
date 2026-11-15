"use client";

import { useAdminCategories, useAdminOrders, useAdminProducts, useAdminStockList } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { money, shortId } from "../../components/format";
import { ErrorNotice, QueryState } from "../../components/page-state";
import { StatusBadge } from "../../components/status-badge";

function Stat({ label, value, error, href }: { label: string; value: number | undefined; error: unknown; href: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{error ? "—" : value ?? "…"}</dd>
      <Link href={href}>View</Link>
    </div>
  );
}

// Every figure is a `total` from an existing paged list endpoint (size 1); there is no analytics API.
export function DashboardView() {
  const products = useAdminProducts({ size: 1 });
  const active = useAdminProducts({ size: 1, active: true });
  const categories = useAdminCategories();
  const stock = useAdminStockList({ size: 1 });
  const pending = useAdminOrders({ size: 1, status: "PendingPayment" });
  const paid = useAdminOrders({ size: 1, status: "Paid" });
  const shipped = useAdminOrders({ size: 1, status: "Shipped" });
  const recent = useAdminOrders({ size: 5 });
  const failed = [products, active, categories, stock, pending, paid, shipped].find((q) => q.error)?.error;
  return (
    <>
      <header className="page-header"><h1>Dashboard</h1></header>
      {failed ? <ErrorNotice error={failed} /> : null}
      <dl className="stats">
        <Stat label="Products" value={products.data?.total} error={products.error} href="/products" />
        <Stat label="Active products" value={active.data?.total} error={active.error} href="/products" />
        <Stat label="Categories" value={categories.data?.length} error={categories.error} href="/categories" />
        <Stat label="Products with stock" value={stock.data?.total} error={stock.error} href="/inventory" />
        <Stat label="Awaiting payment" value={pending.data?.total} error={pending.error} href="/orders" />
        <Stat label="To ship" value={paid.data?.total} error={paid.error} href="/orders" />
        <Stat label="In transit" value={shipped.data?.total} error={shipped.error} href="/orders" />
      </dl>
      <h2>Recent orders</h2>
      <QueryState query={recent} isEmpty={(d) => d.items.length === 0} empty="No orders yet.">
        {(data) => (
          <table className="data-table">
            <thead><tr><th>Order</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}><td><Link href={`/orders/${o.id}`}>{shortId(o.id)}</Link></td><td><StatusBadge value={o.status} /></td><td>{money(o.total)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </QueryState>
    </>
  );
}
