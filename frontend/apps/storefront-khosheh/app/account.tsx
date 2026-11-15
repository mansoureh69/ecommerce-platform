"use client";

import { useLogout, useSession } from "@ecommerce/ecommerce-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "../i18n/config";

interface AccountCopy {
  loading: string;
  signedIn: string;
  sessionNote: string;
  ordersTitle: string;
  ordersNote: string;
  profileNote: string;
  signInTitle: string;
  signIn: string;
  register: string;
  logout: string;
  loggingOut: string;
}

export function AccountView({
  locale,
  copy,
}: {
  locale: Locale;
  copy: AccountCopy;
}) {
  const session = useSession();
  const logout = useLogout();
  const router = useRouter();
  if (session.isPending)
    return <p className="commerce-state">{copy.loading}</p>;
  if (!session.data?.authenticated)
    return (
      <section className="empty-panel">
        <h2>{copy.signInTitle}</h2>
        <div className="account-actions">
          <Link className="ui-button" href={`/${locale}/login`}>
            {copy.signIn}
          </Link>
          <Link className="secondary-link" href={`/${locale}/register`}>
            {copy.register}
          </Link>
        </div>
      </section>
    );
  return (
    <div className="account-grid">
      <section className="account-card">
        <h2>{copy.signedIn}</h2>
        <p>{copy.sessionNote}</p>
        <p>{copy.profileNote}</p>
        <button
          className="text-button danger"
          type="button"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => router.push(`/${locale}`),
            })
          }
        >
          {logout.isPending ? copy.loggingOut : copy.logout}
        </button>
      </section>
      <section className="account-card">
        <h2>{copy.ordersTitle}</h2>
        <p>{copy.ordersNote}</p>
      </section>
    </div>
  );
}
