import { notFound } from "next/navigation";
import { CartView } from "../../cart";
import { isLocale, messages } from "../../../i18n/config";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <main className="commerce-page">
      <header className="commerce-hero compact">
        <p className="eyebrow">{copy.cart.eyebrow}</p>
        <h1>{copy.cart.title}</h1>
      </header>
      <CartView locale={locale} copy={copy.cart} />
    </main>
  );
}
