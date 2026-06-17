import { logoutAdmin } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth/session";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <main className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">SEBASAM Operations</p>
            <p className="mt-1 text-sm text-neutral-600">Signed in as {user.email}</p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="border px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}
