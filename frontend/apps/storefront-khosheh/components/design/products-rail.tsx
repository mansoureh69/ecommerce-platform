"use client";

/* eslint-disable @next/next/no-img-element -- product media is served by the API through the BFF proxy */
import type { Product } from "@ecommerce/api-contracts";
import { formatMoney } from "@ecommerce/ecommerce-core";
import { usePrice, useProducts } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { useRef } from "react";

const arrow = "w-10 h-10 rounded-full border border-craft-burlap/40 bg-white hover:bg-coral-vibrant hover:text-white hover:border-coral-vibrant transition-colors flex items-center justify-center shadow-sm";

function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const price = usePrice(product.id);
  const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];
  const href = `/${locale}/products/${product.id}`;
  return (
    <div className="w-[280px] sm:w-[320px] shrink-0 bg-white rounded-2xl border border-craft-burlap/20 p-3.5 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
      <div>
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface-alabaster mb-3">
          {image ? (
            <img alt={image.altText || product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={image.url} />
          ) : null}
          <Link
            href={href}
            aria-label={`مشاهده ${product.name}`}
            className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-coral-vibrant text-white flex items-center justify-center shadow-lg hover:bg-coral-dark transition-all transform hover:scale-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
          </Link>
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-forest-deep text-base group-hover:text-coral-vibrant transition-colors">
            <Link href={href}>{product.name}</Link>
          </h3>
          <p className="text-xs text-ink-mute line-clamp-2">{product.description}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-craft-sand flex items-baseline justify-between">
        <div>
          <span className="text-xs text-ink-mute">قیمت:</span>
          <span className="text-lg font-black text-forest-deep mr-1">{price.data ? formatMoney(price.data, "fa") : "قیمت با هماهنگی"}</span>
        </div>
      </div>
    </div>
  );
}

// Real catalog data only: shows whatever the backend has published.
export function ProductsRail({ locale }: { locale: string }) {
  const products = useProducts({ page: 1, size: 8 });
  const track = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    // RTL scrollLeft runs negative; "previous" (east arrow) moves toward the start, i.e. the right.
    const sign = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: direction * sign * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-12 bg-surface-ivory" id="bouquets">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-coral-vibrant font-black text-xs uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">local_florist</span>
              <span>محبوب‌ترین دسته‌گل‌های این هفته اهواز</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-forest-deep">دسته‌گل‌های رنگین‌کمان و آتشین جنوب</h2>
            <p className="text-sm sm:text-base text-ink-soft mt-1">دست‌پیچ شده با کرافت ارگانیک و روبان بافته شده، همراه یادداشت دست‌نویس اختصاصی</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={arrow} aria-label="قبلی" onClick={() => scroll(-1)}>
              <span className="material-symbols-outlined text-xl">east</span>
            </button>
            <button type="button" className={arrow} aria-label="بعدی" onClick={() => scroll(1)}>
              <span className="material-symbols-outlined text-xl">west</span>
            </button>
          </div>
        </div>
        {products.isPending ? <p className="text-sm text-ink-soft" aria-live="polite">در حال آماده‌سازی دسته‌گل‌ها…</p> : null}
        {products.isError ? <p className="text-sm text-coral-vibrant" role="alert">مجموعه اکنون در دسترس نیست.</p> : null}
        {products.data && products.data.items.length === 0 ? <p className="text-sm text-ink-soft">دسته‌گل‌های بعدی در حال آماده‌سازی‌اند.</p> : null}
        {products.data && products.data.items.length > 0 ? (
          <>
            <div ref={track} className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-4 -mx-2 px-2" id="productTrack">
              {products.data.items.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
            <div className="flex justify-center">
              <Link className="inline-flex items-center justify-center gap-2 min-h-11 px-6 rounded-full border border-ink text-ink font-semibold text-sm transition-colors hover:bg-blush active:translate-y-px" href={`/${locale}/products`}>
                مشاهده همه دسته‌گل‌ها
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
