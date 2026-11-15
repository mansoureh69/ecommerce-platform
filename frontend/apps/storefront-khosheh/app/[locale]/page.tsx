import { notFound } from "next/navigation";
import { isLocale } from "../../i18n/config";
import { CraftStyle } from "../../components/design/craft-style";
import { Gallery } from "../../components/design/gallery";
import { Hero } from "../../components/design/hero";
import { Occasions } from "../../components/design/occasions";
import { ProductsRail } from "../../components/design/products-rail";
import { TrustBar } from "../../components/design/trust-bar";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="sketch-reference">
      <main className="w-full bg-surface-ivory">
        <Hero locale={locale} />
        <TrustBar />
        <ProductsRail locale={locale} />
        <CraftStyle locale={locale} />
        <Occasions locale={locale} />
        <Gallery locale={locale} />
      </main>
    </div>
  );
}
