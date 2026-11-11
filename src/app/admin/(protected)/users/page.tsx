import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createUser } from "@/features/user-management/actions";
import { listUsers } from "@/features/user-management/queries";
import { UserCreateDialog } from "@/features/user-management/components/user-create-dialog";
import { UserList } from "@/features/user-management/components/user-list";
import { PageHeader } from "@/components/ui";

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
      <PageHeader
        title="Gestión de Usuarios"
        primaryAction={<UserCreateDialog action={handleCreateUser} triggerVariant="primary" triggerSize="lg" />}
      />

      {users.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No hay usuarios registrados.</p>
        </div>
      ) : (
        <UserList users={users} currentUserId={current.user.id} />
      )}
    </section>
  );
}
