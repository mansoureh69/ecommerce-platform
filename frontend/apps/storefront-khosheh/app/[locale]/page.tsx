import { notFound } from "next/navigation";
import { CatalogPreview } from "../catalog-preview";
import { isLocale, messages } from "../../i18n/config";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <main>
        <section className="brand-intro" aria-labelledby="brand-title">
          <p className="eyebrow">{copy.home.eyebrow}</p>
          <h1 id="brand-title">{copy.home.title}</h1>
          <p className="intro-copy">{copy.home.intro}</p>
        </section>
        <CatalogPreview locale={locale} copy={copy.home} />
    </main>
  );
}
