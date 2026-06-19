import { AdminShell } from "@/components/layout/admin-shell";
import { requireProfileForPage } from "@/lib/auth/session";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireProfileForPage();

  return (
    <AdminShell displayName={profile.displayName} role={profile.role}>
      {children}
    </AdminShell>
  );
}
