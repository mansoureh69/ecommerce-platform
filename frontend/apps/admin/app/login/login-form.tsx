"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useLogout } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type CredentialsForm = z.infer<typeof credentialsSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const logout = useLogout();
  const form = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: CredentialsForm) {
    const session = await login.mutateAsync(values);
    if (!session.roles.includes("Admin")) {
      await logout.mutateAsync();
      form.setError("root", { message: "This account does not have administrator access." });
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Field label="Email" error={form.formState.errors.email?.message}>
        {(id, describedBy) => (
          <Input id={id} type="email" autoComplete="username" aria-describedby={describedBy} {...form.register("email")} />
        )}
      </Field>
      <Field label="Password" error={form.formState.errors.password?.message}>
        {(id, describedBy) => (
          <Input id={id} type="password" autoComplete="current-password" aria-describedby={describedBy} {...form.register("password")} />
        )}
      </Field>
      {form.formState.errors.root?.message ? <p role="alert">{form.formState.errors.root.message}</p> : null}
      {login.error ? <p role="alert">{login.error.message}</p> : null}
      <Button type="submit" disabled={login.isPending || logout.isPending}>
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
