import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">EcommercePlatform</p>
        <h1 id="login-title">Administration</h1>
        <p>Sign in with an administrator account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
