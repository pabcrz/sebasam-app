import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createUser } from "@/features/user-management/actions";
import { listUsers } from "@/features/user-management/queries";
import { UserCreateForm } from "@/features/user-management/components/user-create-form";
import { UserList } from "@/features/user-management/components/user-list";

export const metadata: Metadata = {
  title: "Usuarios",
};

export default async function UsersPage() {
  const current = await requireSuperAdmin();
  const users = await listUsers();

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] md:text-3xl">
          Gestión de Usuarios
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Alta, roles, estado y contraseñas de usuarios. Exclusivo para Super Admin.
        </p>
      </div>

      <UserCreateForm
        action={async (formData) => {
          "use server";
          const data = Object.fromEntries(formData);
          try {
            await createUser(data);
            return { success: true };
          } catch (error) {
            return { error: error instanceof Error ? error.message : "Error al crear usuario" };
          }
        }}
      />

      <div className="mt-4">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--color-text-main)]">
          Usuarios Registrados
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No hay usuarios registrados.</p>
        ) : (
          <UserList users={users} currentUserId={current.user.id} />
        )}
      </div>
    </section>
  );
}
