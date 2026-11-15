import { notFound } from "next/navigation";
import { AuthForm } from "../../auth-form";
import { isLocale, messages } from "../../../i18n/config";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>{copy.auth.registerTitle}</h1>
        <AuthForm
          mode="register"
          copy={copy.auth}
          redirectTo={`/${locale}/account`}
        />
      </section>
    </main>
  );
}
