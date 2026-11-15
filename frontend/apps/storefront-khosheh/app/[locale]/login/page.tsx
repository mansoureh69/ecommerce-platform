import { notFound } from "next/navigation";
import { AuthForm } from "../../auth-form";
import { isLocale, messages } from "../../../i18n/config";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const requested = (await searchParams).returnTo;
  const redirectTo =
    requested?.startsWith(`/${locale}/`) &&
    !requested.startsWith(`/${locale}//`)
      ? requested
      : `/${locale}`;
  const copy = await messages(locale);
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>{copy.auth.loginTitle}</h1>
        <AuthForm mode="login" locale={locale} copy={copy.auth} redirectTo={redirectTo} />
      </section>
    </main>
  );
}
