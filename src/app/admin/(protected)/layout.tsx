import { AdminShell } from "@/components/layout/admin-shell";
import { requireProfileForPage } from "@/lib/auth/session";
import { measureServerTiming } from "@/lib/server-timing";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await measureServerTiming(
    "render",
    "admin.layout.profile-ready",
    requireProfileForPage,
  );

  return (
    <AdminShell displayName={profile.displayName} role={profile.role}>
      {children}
    </AdminShell>
  );
}
