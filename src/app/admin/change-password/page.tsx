import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { changePassword } from "@/features/auth/actions";
import { requireProfileForPasswordChangePage } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Actualizar contraseña",
};

export default async function ChangePasswordPage() {
  await requireProfileForPasswordChangePage();

  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-4 py-12 md:px-6">
      <Card className="w-full md:max-w-100">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">SEBASAM</p>
          <CardTitle as="h1" className="mt-2 break-words text-3xl">Actualiza tu contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">Por seguridad, debes establecer una nueva contraseña antes de continuar.</p>
          <ChangePasswordForm action={changePassword} />
        </CardContent>
      </Card>
    </main>
  );
}
