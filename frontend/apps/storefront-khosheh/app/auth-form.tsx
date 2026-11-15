"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useRegister } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface AuthMessages {
  email: string;
  password: string;
  loginAction: string;
  registerAction: string;
  pending: string;
  emailError: string;
  passwordError: string;
}

export function AuthForm({
  mode,
  copy,
  redirectTo,
}: {
  mode: "login" | "register";
  copy: AuthMessages;
  redirectTo: string;
}) {
  const credentialsSchema = z.object({
    email: z.email(copy.emailError),
    password: z.string().min(12, copy.passwordError),
  });
  type CredentialsForm = z.infer<typeof credentialsSchema>;
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();
  const mutation = mode === "login" ? login : register;
  const form = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: CredentialsForm) {
    await mutation.mutateAsync(values);
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <Field label={copy.email} error={form.formState.errors.email?.message}>
        {(id, describedBy) => (
          <Input
            id={id}
            type="email"
            autoComplete="username"
            aria-describedby={describedBy}
            {...form.register("email")}
          />
        )}
      </Field>
      <Field
        label={copy.password}
        error={form.formState.errors.password?.message}
      >
        {(id, describedBy) => (
          <Input
            id={id}
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            aria-describedby={describedBy}
            {...form.register("password")}
          />
        )}
      </Field>
      {mutation.error ? <p role="alert">{mutation.error.message}</p> : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending
          ? copy.pending
          : mode === "login"
            ? copy.loginAction
            : copy.registerAction}
      </Button>
    </form>
  );
}
