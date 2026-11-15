import { notFound } from "next/navigation";
import { AccountView } from "../../account";
import { isLocale, messages } from "../../../i18n/config";

export default async function AccountPage({
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
        <p className="eyebrow">{copy.account.eyebrow}</p>
        <h1>{copy.account.title}</h1>
      </header>
      <AccountView locale={locale} copy={copy.account} />
    </main>
  );
}
