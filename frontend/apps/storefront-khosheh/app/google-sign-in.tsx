"use client";

import { useGoogleLogin } from "@ecommerce/ecommerce-hooks";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef } from "react";

interface GoogleId {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleId;
  }
}

// The client id is public (it identifies the app to Google); the backend verifies every token's audience.
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignIn({
  mode,
  locale,
  redirectTo,
  copy,
}: {
  mode: "login" | "register";
  locale: string;
  redirectTo: string;
  copy: { or: string; googleError: string };
}) {
  const router = useRouter();
  const google = useGoogleLogin();
  const slot = useRef<HTMLDivElement>(null);
  if (!clientId) return null;

  function render() {
    const api = window.google?.accounts.id;
    if (!api || !slot.current || !clientId) return;
    api.initialize({
      client_id: clientId,
      callback: ({ credential }) =>
        google.mutate(credential, {
          onSuccess: () => {
            router.replace(redirectTo);
            router.refresh();
          },
        }),
    });
    slot.current.replaceChildren();
    api.renderButton(slot.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: mode === "login" ? "signin_with" : "signup_with",
      locale,
      width: 280,
    });
  }

  return (
    <div className="google-signin">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} />
      <p className="google-signin-or" aria-hidden="true">{copy.or}</p>
      <div ref={slot} className="google-signin-button" />
      {google.isError ? <p role="alert">{google.error.message || copy.googleError}</p> : null}
    </div>
  );
}
