import { requireUser } from "@/lib/auth/session";

export default async function SetupRequiredPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl border p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Setup required
        </p>
        <h1 className="mt-3 text-2xl font-semibold">User profile missing</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          Your Supabase Auth session is valid, but this account does not have an active app
          profile yet. Ask an administrator to create a matching UserProfile before using
          operational screens.
        </p>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-neutral-700">Auth user id</dt>
            <dd className="mt-1 break-all font-mono text-neutral-600">{user.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-700">Email</dt>
            <dd className="mt-1 break-all font-mono text-neutral-600">{user.email}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
