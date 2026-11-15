import { notFound } from "next/navigation";
import { CheckoutForm } from "../../checkout-form";
import { isLocale, messages } from "../../../i18n/config";

export default async function CheckoutPage({
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
        <p className="eyebrow">{copy.checkout.eyebrow}</p>
        <h1>{copy.checkout.title}</h1>
      </header>
      <CheckoutForm locale={locale} copy={copy.checkout} />
    </main>
  );
}
