import { LoginForm } from "./login-form";

const reasons: Record<string, string> = {
  expired: "Your session has ended. Sign in again.",
  forbidden: "This account does not have administrator access.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const notice = reason ? reasons[reason] : undefined;
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">EcommercePlatform</p>
        <h1 id="login-title">Administration</h1>
        {notice ? <p role="status" className="notice">{notice}</p> : <p>Sign in with an administrator account.</p>}
        <LoginForm />
      </section>
    </main>
  );
}
