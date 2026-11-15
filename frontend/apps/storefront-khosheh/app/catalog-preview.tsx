"use client";

import { useProducts } from "@ecommerce/ecommerce-hooks";
import { KhoshehProductCard } from "../components/khosheh-product-card";
import type { Locale } from "../i18n/config";

interface CatalogCopy {
  catalogTitle: string;
  loading: string;
  empty: string;
  error: string;
  viewProduct: string;
  pricePending: string;
}

export function CatalogPreview({ locale, copy }: { locale: Locale; copy: CatalogCopy }) {
  const products = useProducts({ page: 1, size: 6 });
  if (products.isPending) return <p className="catalog-state" aria-live="polite">{copy.loading}</p>;
  if (products.isError) return <p className="catalog-state" role="alert">{copy.error}</p>;
  if (products.data.items.length === 0) return <p className="catalog-state">{copy.empty}</p>;
  return (
    <section id="collection" className="collection" aria-labelledby="catalog-title">
      <h2 id="catalog-title">{copy.catalogTitle}</h2>
      <div className="product-grid">
        {products.data.items.map((product) => (
          <KhoshehProductCard key={product.id} product={product} locale={locale} viewLabel={copy.viewProduct} pendingPriceLabel={copy.pricePending} />
        ))}
      </div>
    </section>
  );
}
