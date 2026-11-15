import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has("ecommerce_admin_session")) redirect("/login");
  return (
    <main className="app-shell">
      <p className="eyebrow">Administration</p>
      <h1>Dashboard foundation</h1>
      <p>The authenticated API client is ready for Catalog, pricing, inventory, order, and payment screens.</p>
    </main>
  );
}
