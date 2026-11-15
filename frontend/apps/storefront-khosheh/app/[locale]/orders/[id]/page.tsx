import { notFound } from "next/navigation";
import { OrderDetail } from "../../../order-detail";
import { isLocale, messages } from "../../../../i18n/config";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <main className="commerce-page order-page">
      <p className="eyebrow">{copy.order.eyebrow}</p>
      <OrderDetail id={id} locale={locale} copy={copy.order} />
    </main>
  );
}
