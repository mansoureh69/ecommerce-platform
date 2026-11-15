"use client";

import { cartQuantity } from "@ecommerce/ecommerce-core";
import { useCart, useSession } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";

const nav = [
  ["دسته‌گل مناسبتی", "#occasions"],
  ["دسته‌گل عروس", "#occasions"],
  ["باکس گل", "#occasions"],
  ["دست‌پیچ کنفی", "#craft-style"],
  ["ماشین عروس", "#occasions"],
  ["دیزاین مجالس", "#occasions"],
  ["تاج گل", "#occasions"],
] as const;

const linkClass = "px-2.5 py-1.5 rounded-full hover:bg-blush-soft hover:text-coral-vibrant transition-colors whitespace-nowrap shrink-0";

export function SiteHeader({ locale }: { locale: string }) {
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const cart = useCart(authenticated);
  const count = cart.data ? cartQuantity(cart.data) : 0;
  const home = `/${locale}`;
  return (
    <header className="sticky top-0 w-full z-40 bg-surface-ivory/95 backdrop-blur-md border-b border-craft-sand shadow-[0_4px_20px_rgba(224,83,60,0.05)]">
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-nowrap items-center justify-between gap-2 lg:gap-3">
        <Link className="flex items-center gap-2.5 group shrink-0" href={home}>
          <div className="relative w-12 h-12 shrink-0 transition-transform group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element -- exact markup of the approved design */}
            <img alt="لوگوی رسمی گل‌فروشی خوشه اهواز" className="w-full h-full object-contain" src="/images/khosheh-logo.jpg" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-forest-deep tracking-tight group-hover:text-coral-vibrant transition-colors">گل‌فروشی خوشه</span>
            </div>
          </div>
        </Link>
        <nav className="hidden lg:flex flex-nowrap items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-semibold text-ink-soft shrink-0" aria-label="منوی اصلی">
          <Link className="px-2.5 py-1.5 rounded-full bg-forest-deep text-white font-bold whitespace-nowrap shrink-0" href={home}>خانه</Link>
          <Link className={linkClass} href={`${home}/products`}>همه گل‌ها</Link>
          {nav.map(([label, hash]) => (
            <Link key={label} className={linkClass} href={`${home}${hash}`}>{label}</Link>
          ))}
        </nav>
        <div className="flex flex-nowrap items-center gap-2 shrink-0">
          <Link
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-blush-soft text-coral-vibrant hover:bg-coral-vibrant hover:text-white transition-all text-xs font-bold shadow-sm whitespace-nowrap shrink-0"
            href={`${home}/${authenticated ? "account" : "login"}`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            <span>{authenticated ? "حساب من" : "ورود"}</span>
          </Link>
          <Link
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-coral-vibrant text-white hover:bg-coral-dark transition-all text-xs font-bold shadow-md shadow-coral-vibrant/25 whitespace-nowrap shrink-0"
            href={`${home}/cart`}
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            <span>سبد خرید ({count.toLocaleString("fa-IR")})</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
