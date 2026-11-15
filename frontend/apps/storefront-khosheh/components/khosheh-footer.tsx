import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../i18n/config";

interface FooterCopy {
  brand: { name: string };
  nav: {
    home: string;
    shop: string;
    gifts: string;
    story: string;
    signIn: string;
    register: string;
  };
  footer: { tagline: string; shop: string; account: string; copyright: string };
  landing: {
    contact: { title: string; address: string; hours: string };
    services: { title: string; links: string[] };
  };
}

export function KhoshehFooter({
  locale,
  copy,
}: {
  locale: Locale;
  copy: FooterCopy;
}) {
  return (
    <footer className="khosheh-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Image src="/images/khosheh-logo.jpg" alt="" width={64} height={64} />
          <div>
            <h2>{copy.brand.name}</h2>
            <p>{copy.footer.tagline}</p>
          </div>
        </div>
        <div>
          <h3>{copy.landing.contact.title}</h3>
          <p>{copy.landing.contact.address}</p>
          <p>{copy.landing.contact.hours}</p>
        </div>
        <div>
          <h3>{copy.landing.services.title}</h3>
          <Link href={`/${locale}/products`}>{copy.landing.services.links[0]}</Link>
          <Link href={`/${locale}#occasions`}>{copy.landing.services.links[1]}</Link>
          <Link href={`/${locale}#delivery`}>{copy.landing.services.links[2]}</Link>
        </div>
        <div>
          <h3>{copy.footer.shop}</h3>
          <Link href={`/${locale}/products`}>{copy.nav.shop}</Link>
          <Link href={`/${locale}/products`}>{copy.nav.gifts}</Link>
          <Link href={`/${locale}#craft`}>{copy.nav.story}</Link>
        </div>
        <div>
          <h3>{copy.footer.account}</h3>
          <Link href={`/${locale}/account`}>{copy.footer.account}</Link>
          <Link href={`/${locale}/login`}>{copy.nav.signIn}</Link>
          <Link href={`/${locale}/register`}>{copy.nav.register}</Link>
        </div>
      </div>
      <p className="footer-legal">© 2026 {copy.footer.copyright}</p>
    </footer>
  );
}
