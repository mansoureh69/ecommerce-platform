"use client";

import { formatMoney } from "@ecommerce/ecommerce-core";
import {
  useCart,
  usePrice,
  useProduct,
  useSession,
  useSetCartLine,
} from "@ecommerce/ecommerce-hooks";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Locale } from "../i18n/config";

interface ProductCopy {
  loading: string;
  error: string;
  pricePending: string;
  back: string;
  quantity: string;
  add: string;
  adding: string;
  added: string;
  signIn: string;
  addError: string;
  gallery: string;
  details: string;
  variants: string;
  variantsNote: string;
}

export function KhoshehProductDetail({
  id,
  locale,
  copy,
}: {
  id: string;
  locale: Locale;
  copy: ProductCopy;
}) {
  const product = useProduct(id);
  const price = usePrice(id);
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const cart = useCart(authenticated);
  const setLine = useSetCartLine();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  if (product.isPending)
    return (
      <main className="product-detail-state" aria-live="polite">
        {copy.loading}
      </main>
    );
  if (product.isError)
    return (
      <main className="product-detail-state" role="alert">
        {copy.error}
      </main>
    );
  const images = product.data.images ?? [];
  const image =
    images.find((item) => item.id === selectedImage) ??
    images.find((item) => item.isPrimary) ??
    images[0];
  const existingQuantity =
    cart.data?.lines.find((line) => line.productId === id)?.quantity ?? 0;
  const addToCart = () => {
    setAdded(false);
    setLine.mutate(
      { productId: id, quantity: Math.min(999, existingQuantity + quantity) },
      { onSuccess: () => setAdded(true) },
    );
  };
  return (
    <main className="product-detail">
      <div className="product-detail-media">
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || product.data.name}
            width={image.width}
            height={image.height}
            sizes="(max-width: 48rem) 100vw, 58vw"
            priority
          />
        ) : null}
        {images.length > 1 ? (
          <div className="product-thumbnails" aria-label={copy.gallery}>
            {images.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === image?.id}
                onClick={() => setSelectedImage(item.id)}
              >
                <Image
                  src={item.thumbnailUrl}
                  alt={item.altText || product.data.name}
                  width={96}
                  height={96}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="product-detail-copy">
        <Link href={`/${locale}/products`}>{copy.back}</Link>
        <h1>{product.data.name}</h1>
        <p className="product-detail-price">
          {price.data ? formatMoney(price.data, locale) : copy.pricePending}
        </p>
        <section aria-labelledby="product-details-title">
          <h2 id="product-details-title">{copy.details}</h2>
          <p>{product.data.description}</p>
        </section>
        {product.data.variants?.length ? (
          <section className="variant-list" aria-labelledby="variant-title">
            <h2 id="variant-title">{copy.variants}</h2>
            <p>{copy.variantsNote}</p>
            <ul>
              {product.data.variants
                .filter((variant) => variant.active)
                .map((variant) => (
                  <li key={variant.id}>
                    <strong>{variant.name}</strong>
                    {variant.attributes.map((attribute) => (
                      <span key={attribute.name}>
                        {attribute.name}: {attribute.value}
                      </span>
                    ))}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
        {authenticated ? (
          <div className="add-to-cart">
            <label htmlFor="product-quantity">{copy.quantity}</label>
            <input
              id="product-quantity"
              className="ui-input quantity-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.max(1, Math.min(999, Number(event.target.value) || 1)),
                )
              }
            />
            <button
              className="ui-button"
              type="button"
              disabled={setLine.isPending || cart.isPending || !price.data}
              onClick={addToCart}
            >
              {setLine.isPending ? copy.adding : copy.add}
            </button>
          </div>
        ) : (
          <Link
            className="ui-button product-sign-in"
            href={`/${locale}/login?returnTo=/${locale}/products/${id}`}
          >
            {copy.signIn}
          </Link>
        )}
        {added ? (
          <p className="form-success" role="status">
            {copy.added}
          </p>
        ) : null}
        {setLine.isError ? (
          <p className="form-error" role="alert">
            {copy.addError}
          </p>
        ) : null}
      </div>
    </main>
  );
}
