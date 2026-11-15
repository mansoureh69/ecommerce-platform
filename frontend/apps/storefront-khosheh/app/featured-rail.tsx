"use client";

import { useProducts } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { useRef } from "react";
import { KhoshehProductCard } from "../components/khosheh-product-card";
import { Icon } from "../components/landing/icons";
import type { Locale } from "../i18n/config";

interface FeaturedCopy {
  eyebrow: string;
  title: string;
  intro: string;
  previous: string;
  next: string;
  viewAll: string;
}
interface StateCopy {
  loading: string;
  empty: string;
  error: string;
  viewProduct: string;
  pricePending: string;
}

// Real catalog data only: the rail shows whatever the backend has published.
export function FeaturedRail({ locale, copy, states }: { locale: Locale; copy: FeaturedCopy; states: StateCopy }) {
  const products = useProducts({ page: 1, size: 8 });
  const rail = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    // scrollBy is direction-aware in RTL (negative scrollLeft), so "forward" = reading direction.
    const sign = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: direction * sign * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section id="bouquets" className="band" aria-labelledby="featured-title">
      <div className="band-inner">
        <div className="band-head">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="featured-title">{copy.title}</h2>
            <p className="lead">{copy.intro}</p>
          </div>
          <div className="rail-controls">
            <button type="button" className="round-button is-previous" aria-label={copy.previous} onClick={() => scroll(-1)}><Icon name="chevron" size={20} /></button>
            <button type="button" className="round-button is-next" aria-label={copy.next} onClick={() => scroll(1)}><Icon name="chevron" size={20} /></button>
          </div>
        </div>
        {products.isPending ? <p className="catalog-state" aria-live="polite">{states.loading}</p> : null}
        {products.isError ? <p className="catalog-state" role="alert">{states.error}</p> : null}
        {products.data && products.data.items.length === 0 ? <p className="catalog-state">{states.empty}</p> : null}
        {products.data && products.data.items.length > 0 ? (
          <>
            <ul ref={rail} className="rail" tabIndex={0} aria-label={copy.title}>
              {products.data.items.map((product) => (
                <li key={product.id}>
                  <KhoshehProductCard product={product} locale={locale} viewLabel={states.viewProduct} pendingPriceLabel={states.pricePending} />
                </li>
              ))}
            </ul>
            <p className="rail-more"><Link href={`/${locale}/products`}>{copy.viewAll}</Link></p>
          </>
        ) : null}
      </div>
    </section>
  );
}
