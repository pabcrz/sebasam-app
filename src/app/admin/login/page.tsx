import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const errorMessages: Record<string, string> = {
  missing: "Ingresa tu usuario y contraseña.",
  invalid: "El usuario o la contraseña son incorrectos.",
};

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/admin");
  }

  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 md:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Operaciones SEBASAM
          </p>
          <CardTitle as="h1" className="mt-2 text-2xl md:text-3xl">
            Iniciar sesión
          </CardTitle>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Ingresa con tu usuario de SEBASAM para acceder a las pantallas operativas protegidas.
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-6 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              {error}
            </p>
          ) : null}

          <form action={loginAdmin} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="pablo"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
