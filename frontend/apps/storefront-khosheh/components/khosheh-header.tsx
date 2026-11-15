"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cartQuantity } from "@ecommerce/ecommerce-core";
import { useCart, useSession } from "@ecommerce/ecommerce-hooks";
import type { Locale } from "../i18n/config";

interface HeaderCopy {
  brand: { name: string; descriptor: string };
  nav: {
    home: string;
    shop: string;
    gifts: string;
    story: string;
    signIn: string;
    account: string;
    cart: string;
    cartItems: string;
    menu: string;
  };
  locale: { label: string; en: string; fa: string; ar: string };
}

export function KhoshehHeader({
  locale,
  copy,
}: {
  locale: Locale;
  copy: HeaderCopy;
}) {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const authenticated = session.data?.authenticated === true;
  const cart = useCart(authenticated);
  const count = cart.data ? cartQuantity(cart.data) : 0;
  return (
    <header className="khosheh-header">
      <Link
        className="wordmark"
        href={`/${locale}`}
        aria-label={`${copy.brand.name}, ${copy.nav.home}`}
      >
        <Image
          src="/images/khosheh-logo.jpg"
          alt=""
          width={48}
          height={48}
          priority
        />
        <span>
          <strong>{copy.brand.name}</strong>
          <small>{copy.brand.descriptor}</small>
        </span>
      </Link>
      <nav
        id="primary-navigation"
        className={open ? "primary-nav is-open" : "primary-nav"}
        aria-label={copy.nav.shop}
      >
        <Link href={`/${locale}`}>{copy.nav.home}</Link>
        <Link href={`/${locale}/products`} onClick={() => setOpen(false)}>
          {copy.nav.shop}
        </Link>
        <Link href={`/${locale}/products`} onClick={() => setOpen(false)}>
          {copy.nav.gifts}
        </Link>
        <Link href={`/${locale}#story`} onClick={() => setOpen(false)}>
          {copy.nav.story}
        </Link>
      </nav>
      <div className="header-actions">
        <div className="locale-links" aria-label={copy.locale.label}>
          <Link
            href="/en"
            lang="en"
            aria-current={locale === "en" ? "page" : undefined}
          >
            EN
          </Link>
          <Link
            href="/fa"
            lang="fa"
            aria-current={locale === "fa" ? "page" : undefined}
          >
            FA
          </Link>
          <Link
            href="/ar"
            lang="ar"
            aria-current={locale === "ar" ? "page" : undefined}
          >
            AR
          </Link>
        </div>
        <Link
          className="header-cart"
          href={`/${locale}/cart`}
          aria-label={`${copy.nav.cart}: ${count} ${copy.nav.cartItems}`}
        >
          {copy.nav.cart}
          <span aria-hidden="true">{count}</span>
        </Link>
        <Link
          className="account-link"
          href={`/${locale}/${authenticated ? "account" : "login"}`}
        >
          {authenticated ? copy.nav.account : copy.nav.signIn}
        </Link>
        <button
          className="menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{copy.nav.menu}</span>
          <span
            className={open ? "menu-lines is-open" : "menu-lines"}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>
    </header>
  );
}
