import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin login",
};

const errorMessages: Record<string, string> = {
  missing: "Enter your username and password.",
  invalid: "The username or password is incorrect.",
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
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-md border p-6">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">SEBASAM Operations</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Admin login</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Sign in with your SEBASAM username to access protected operational screens.
          </p>
        </div>

        {error ? (
          <p className="mb-6 border px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <form action={loginAdmin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="w-full border px-4 py-3 font-semibold focus:outline-none focus:ring-2"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
