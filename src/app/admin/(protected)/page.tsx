import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminHomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="border p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Protected admin area</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operational dashboard</h1>
        <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
          This screen verifies the server-side session boundary for admin operations. Role and profile bootstrap checks are intentionally left for Issue 4.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/customers" className="border px-4 py-2 font-medium">
            Manage customers
          </Link>
          <Link href="/admin/quotes" className="border px-4 py-2 font-medium">
            Manage quotes
          </Link>
        </div>
      </div>
    </section>
  );
}
