import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createUser } from "@/features/user-management/actions";
import { listUsers } from "@/features/user-management/queries";
import { UserCreateDialog } from "@/features/user-management/components/user-create-dialog";
import { UserList } from "@/features/user-management/components/user-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Gestión de Usuarios",
};

export default async function UsersPage() {
  const current = await requireSuperAdmin();
  const users = await listUsers();

  const handleCreateUser = async (formData: FormData) => {
    "use server";
    const data = Object.fromEntries(formData);
    try {
      await createUser(data);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error al crear usuario" };
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Gestión de Usuarios
        </h1>
        <div className="hidden sm:block">
          <UserCreateDialog
            action={handleCreateUser}
            triggerVariant="primary"
            triggerSize="sm"
            triggerClassName="w-full sm:w-auto"
          />
        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Usuarios registrados</CardTitle>
          <CardDescription>
            Alta, roles, estado y contraseñas de usuarios. Exclusivo para Super Admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {users.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">No hay usuarios registrados.</p>
            </div>
          ) : (
            <UserList users={users} currentUserId={current.user.id} />
          )}
        </CardContent>
      </Card>

      {/* Mobile Floating Action Button */}
      <div
        className="fixed right-[calc(1rem+var(--removed-body-scroll-bar-size,0px))] z-40 sm:hidden"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <UserCreateDialog
          action={handleCreateUser}
          triggerVariant="primary"
          triggerSize="sm"
          triggerClassName="h-11 px-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-1.5 border border-white/20"
        />
      </div>
    </section>
  );
}
