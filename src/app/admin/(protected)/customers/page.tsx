import type { Metadata } from "next";
import Link from "next/link";
import { createCustomerFromForm } from "@/features/customers/actions";
import { listCustomers } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Customers",
};

type CustomersPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
    q?: string;
    updated?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const customers = await listCustomers({ query });

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10">
      <div className="border p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Customer management</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
          Create customers, search by useful identifiers, and edit basic customer records.
        </p>
        {params.created ? <p className="mt-4 text-sm">Customer created.</p> : null}
        {params.updated ? <p className="mt-4 text-sm">Customer updated.</p> : null}
        {params.error === "invalid" ? (
          <p className="mt-4 text-sm" role="alert">
            Check the customer details and try again.
          </p>
        ) : null}
      </div>

      <form action={createCustomerFromForm} className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Create customer</h2>
        <label className="grid gap-2">
          <span>Name</span>
          <input name="name" required className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Email</span>
          <input name="email" type="email" className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Phone</span>
          <input name="phone" className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Address</span>
          <textarea name="address" className="border px-3 py-2" rows={3} />
        </label>
        <label className="grid gap-2">
          <span>Notes</span>
          <textarea name="notes" className="border px-3 py-2" rows={3} />
        </label>
        <button type="submit" className="w-fit border px-4 py-2 font-medium">
          Create customer
        </button>
      </form>

      <div className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Search customers</h2>
        <form className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name, phone, email, address, or notes"
            className="min-w-72 flex-1 border px-3 py-2"
          />
          <button type="submit" className="border px-4 py-2 font-medium">
            Search
          </button>
          {query ? (
            <Link href="/admin/customers" className="border px-4 py-2 font-medium">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-3 pr-4 font-medium">{customer.name}</td>
                  <td className="py-3 pr-4">{customer.email ?? "—"}</td>
                  <td className="py-3 pr-4">{customer.phone ?? "—"}</td>
                  <td className="py-3 pr-4">{customer.status}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/customers/${customer.id}/edit`} className="underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td className="py-6" colSpan={5}>
                    No customers found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
