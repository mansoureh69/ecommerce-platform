"use client";

import { useLogout } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  ["/dashboard", "Dashboard"], ["/products", "Products"], ["/categories", "Categories"], ["/pricing", "Pricing"],
  ["/inventory", "Inventory"], ["/orders", "Orders"], ["/payments", "Payments"],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  async function signOut() {
    await logout.mutateAsync();
    router.replace("/login");
    router.refresh();
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">EcommercePlatform<span>Administration</span></p>
        <nav aria-label="Main">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <button type="button" className="ui-button secondary" onClick={() => void signOut()} disabled={logout.isPending}>Sign out</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
