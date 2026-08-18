"use client";

import * as React from "react";
import { Button, Label, PasswordInput } from "@/components/ui";

type ChangePasswordFormProps = {
  action: (formData: FormData) => Promise<{ error?: string }>;
};

export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const errorId = React.useId();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      setError(result.error ?? null);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" required disabled={isPending} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmation">Confirmar contraseña</Label>
        <PasswordInput id="confirmation" name="confirmation" autoComplete="new-password" required disabled={isPending} aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} />
      </div>
      <p id={errorId} className="min-h-5 text-sm text-[var(--color-status-danger-fg)]" role={error ? "alert" : undefined} aria-live={error ? "assertive" : "off"}>
        {error}
      </p>
      <Button type="submit" variant="primary" className="w-full" loading={isPending}>
        Actualizar contraseña
      </Button>
    </form>
  );
}
