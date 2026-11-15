"use client";

import { useCategories, useProducts } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KhoshehProductCard } from "../components/khosheh-product-card";
import type { Locale } from "../i18n/config";

interface CatalogCopy {
  all: string;
  filterLabel: string;
  loading: string;
  empty: string;
  error: string;
  viewProduct: string;
  pricePending: string;
  previous: string;
  next: string;
  page: string;
  of: string;
}

export function Catalog({
  locale,
  copy,
}: {
  locale: Locale;
  copy: CatalogCopy;
}) {
  const searchParams = useSearchParams();
  const selected = searchParams.get("category") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const categories = useCategories();
  const products = useProducts({
    page,
    size: 9,
    categoryId: selected || undefined,
  });
  const totalPages = products.data
    ? Math.max(1, Math.ceil(products.data.total / products.data.size))
    : 1;
  const href = (nextPage: number, category = selected) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/${locale}/products${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <div className="catalog-filters" aria-label={copy.filterLabel}>
        <Link
          className={!selected ? "is-active" : ""}
          href={href(1, "")}
          aria-current={!selected ? "page" : undefined}
        >
          {copy.all}
        </Link>
        {categories.data?.map((category) => (
          <Link
            key={category.id}
            className={selected === category.id ? "is-active" : ""}
            href={href(1, category.id)}
            aria-current={selected === category.id ? "page" : undefined}
          >
            {category.name}
          </Link>
        ))}
      </div>
      {products.isPending ? (
        <p className="catalog-state" aria-live="polite">
          {copy.loading}
        </p>
      ) : null}
      {products.isError ? (
        <p className="catalog-state" role="alert">
          {copy.error}
        </p>
      ) : null}
      {products.data?.items.length === 0 ? (
        <p className="catalog-state">{copy.empty}</p>
      ) : null}
      {products.data?.items.length ? (
        <div className="product-grid catalog-product-grid">
          {products.data.items.map((product) => (
            <KhoshehProductCard
              key={product.id}
              product={product}
              locale={locale}
              viewLabel={copy.viewProduct}
              pendingPriceLabel={copy.pricePending}
            />
          ))}
        </div>
      ) : null}
      {products.data && totalPages > 1 ? (
        <nav
          className="pagination"
          aria-label={`${copy.page} ${page} ${copy.of} ${totalPages}`}
        >
          {page > 1 ? (
            <Link href={href(page - 1)}>{copy.previous}</Link>
          ) : (
            <span aria-disabled="true">{copy.previous}</span>
          )}
          <p>
            {copy.page} <strong>{page}</strong> {copy.of} {totalPages}
          </p>
          {page < totalPages ? (
            <Link href={href(page + 1)}>{copy.next}</Link>
          ) : (
            <span aria-disabled="true">{copy.next}</span>
          )}
        </nav>
      ) : null}
    </>
  );
}
