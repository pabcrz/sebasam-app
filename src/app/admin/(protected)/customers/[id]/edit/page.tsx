import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomerBasicsFromForm } from "@/features/customers/actions";
import { getCustomerById } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Edit customer",
};

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditCustomerPage({ params, searchParams }: EditCustomerPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const updateCustomer = updateCustomerBasicsFromForm.bind(null, customer.id);

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8 px-6 py-10">
      <div className="border p-6">
        <Link href="/admin/customers" className="text-sm underline">
          Back to customers
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Edit customer</h1>
        <p className="mt-4 leading-7 text-neutral-600">Update basic customer details.</p>
        {query.error === "invalid" ? (
          <p className="mt-4 text-sm" role="alert">
            Check the customer details and try again.
          </p>
        ) : null}
      </div>

      <form action={updateCustomer} className="grid gap-4 border p-6">
        <label className="grid gap-2">
          <span>Name</span>
          <input name="name" required defaultValue={customer.name} className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Email</span>
          <input
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            className="border px-3 py-2"
          />
        </label>
        <label className="grid gap-2">
          <span>Phone</span>
          <input name="phone" defaultValue={customer.phone ?? ""} className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Status</span>
          <select name="status" defaultValue={customer.status} className="border px-3 py-2">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span>Address</span>
          <textarea
            name="address"
            defaultValue={customer.address ?? ""}
            className="border px-3 py-2"
            rows={3}
          />
        </label>
        <label className="grid gap-2">
          <span>Notes</span>
          <textarea
            name="notes"
            defaultValue={customer.notes ?? ""}
            className="border px-3 py-2"
            rows={3}
          />
        </label>
        <button type="submit" className="w-fit border px-4 py-2 font-medium">
          Save customer
        </button>
      </form>
    </section>
  );
}
