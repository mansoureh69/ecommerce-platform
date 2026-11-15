import { notFound } from "next/navigation";
import { isLocale, messages } from "../../i18n/config";
import { CraftStyle } from "../../components/design/craft-style";
import { Gallery } from "../../components/design/gallery";
import { Hero } from "../../components/design/hero";
import { Occasions } from "../../components/design/occasions";
import { ProductsRail } from "../../components/design/products-rail";
import { TrustBar } from "../../components/design/trust-bar";
import { HeroSlider } from "../../components/landing/hero-slider";
import { Craft, Delivery, Occasions as LandingOccasions, Social, TrustStrip } from "../../components/landing/sections";
import { FeaturedRail } from "../featured-rail";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Persian is the approved design (khoshe-flower-shop.vercel.app); en/ar keep the translated layout.
  if (locale === "fa") {
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
  const copy = await messages(locale);
  const { landing } = copy;
  return (
    <main>
      <HeroSlider locale={locale} copy={landing.hero} />
      <TrustStrip items={landing.trust} />
      <FeaturedRail locale={locale} copy={landing.featured} states={copy.home} />
      <Craft copy={landing.craft} />
      <LandingOccasions locale={locale} copy={landing.occasions} />
      <Delivery copy={landing.delivery} />
      <Social copy={landing.social} />
    </main>
  );
}
