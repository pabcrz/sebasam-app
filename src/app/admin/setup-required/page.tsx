import { requireUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SetupRequiredPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12 md:px-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Configuración requerida
          </p>
          <CardTitle as="h1" className="text-2xl">
            Perfil de usuario faltante
          </CardTitle>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            Tu sesión de Supabase Auth es válida, pero esta cuenta aún no tiene un perfil activo en la app.
            Pide a un administrador que cree un UserProfile correspondiente antes de usar las pantallas operativas.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-[var(--color-text-main)]">ID de usuario de autenticación</dt>
              <dd className="mt-1 break-all font-mono text-[var(--color-text-muted)]">{user.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-main)]">Correo electrónico</dt>
              <dd className="mt-1 break-all font-mono text-[var(--color-text-muted)]">{user.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
