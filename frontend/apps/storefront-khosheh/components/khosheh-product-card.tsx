"use client";

import type { Product } from "@ecommerce/api-contracts";
import { formatMoney } from "@ecommerce/ecommerce-core";
import { usePrice } from "@ecommerce/ecommerce-hooks";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../i18n/config";

export function KhoshehProductCard({
  product,
  locale,
  viewLabel,
  pendingPriceLabel,
}: {
  product: Product;
  locale: Locale;
  viewLabel: string;
  pendingPriceLabel: string;
}) {
  const price = usePrice(product.id);
  const primaryImage = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
  return (
    <article className="khosheh-product">
      {primaryImage ? (
        <div className="product-image-wrap">
          <Link className="product-add" href={`/${locale}/products/${product.id}`} aria-label={`${viewLabel}: ${product.name}`}>+</Link>
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText || product.name}
            width={primaryImage.width}
            height={primaryImage.height}
            sizes="(max-width: 48rem) 100vw, 33vw"
            className="product-image"
          />
        </div>
      ) : null}
      <div className="product-copy">
        <h3>{product.name}</h3>
        <p>{price.data ? formatMoney(price.data, locale) : pendingPriceLabel}</p>
        <Link href={`/${locale}/products/${product.id}`}>{viewLabel}</Link>
      </div>
    </article>
  );
}
