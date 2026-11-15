import { notFound } from "next/navigation";
import { KhoshehProductDetail } from "../../../../components/khosheh-product-detail";
import { isLocale, messages } from "../../../../i18n/config";

export default async function ProductFoundationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return <KhoshehProductDetail id={id} locale={locale} copy={copy.product} />;
}
