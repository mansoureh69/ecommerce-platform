import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Catalog } from "../../catalog";
import { isLocale, messages } from "../../../i18n/config";

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <main className="commerce-page">
      <header className="commerce-hero">
        <p className="eyebrow">{copy.catalog.eyebrow}</p>
        <h1>{copy.catalog.title}</h1>
        <p>{copy.catalog.intro}</p>
      </header>
      <Suspense
        fallback={<p className="catalog-state">{copy.catalog.loading}</p>}
      >
        <Catalog locale={locale} copy={copy.catalog} />
      </Suspense>
    </main>
  );
}
