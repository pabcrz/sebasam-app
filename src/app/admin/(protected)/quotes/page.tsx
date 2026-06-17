import type { Metadata } from "next";
import { QuoteItemType } from "@prisma/client";
import { createQuoteFromForm } from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Quotes",
};

type QuotesPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
  }>;
};

const itemTypes = Object.values(QuoteItemType);
const itemRows = Array.from({ length: 5 }, (_, index) => index);

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const [customers, quotes] = await Promise.all([listCustomers(), listQuotes()]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10">
      <div className="border p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Quote management</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Draft quotes</h1>
        <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
          Create draft quotes for existing customers with server-calculated item subtotals and totals.
        </p>
        {params.created ? <p className="mt-4 text-sm">Draft quote created.</p> : null}
        {params.error === "invalid" ? (
          <p className="mt-4 text-sm" role="alert">
            Check the quote details and include at least one complete item row.
          </p>
        ) : null}
      </div>

      <form action={createQuoteFromForm} className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Create draft quote</h2>
        <label className="grid gap-2">
          <span>Customer</span>
          <select name="customerId" required className="border px-3 py-2" defaultValue="">
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span>Title</span>
          <input name="title" required className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Description</span>
          <textarea name="description" className="border px-3 py-2" rows={3} />
        </label>
        <label className="flex items-center gap-2">
          <input name="administrative" type="checkbox" />
          <span>Administrative quote</span>
        </label>

        <div className="grid gap-3">
          <h3 className="font-semibold">Items</h3>
          {itemRows.map((index) => (
            <fieldset key={index} className="grid gap-3 border p-4">
              <legend className="px-1 text-sm font-medium">Item {index + 1}</legend>
              <div className="grid gap-3 md:grid-cols-[160px_1fr_120px_160px]">
                <label className="grid gap-2">
                  <span>Type</span>
                  <select name={`items.${index}.type`} className="border px-3 py-2" defaultValue="SERVICE">
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span>Description</span>
                  <input name={`items.${index}.description`} className="border px-3 py-2" />
                </label>
                <label className="grid gap-2">
                  <span>Quantity</span>
                  <input
                    name={`items.${index}.quantity`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="border px-3 py-2"
                  />
                </label>
                <label className="grid gap-2">
                  <span>Unit price</span>
                  <input
                    name={`items.${index}.unitPrice`}
                    type="number"
                    min="0"
                    step="0.01"
                    className="border px-3 py-2"
                  />
                </label>
              </div>
            </fieldset>
          ))}
        </div>

        <button type="submit" className="w-fit border px-4 py-2 font-medium">
          Create draft quote
        </button>
      </form>

      <div className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Recent quotes</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 pr-4">Number</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Items</th>
                <th className="py-3 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b align-top">
                  <td className="py-3 pr-4 font-medium">{quote.number}</td>
                  <td className="py-3 pr-4">{quote.customer.name}</td>
                  <td className="py-3 pr-4">{quote.title}</td>
                  <td className="py-3 pr-4">{quote.status}</td>
                  <td className="py-3 pr-4">
                    <ul className="grid gap-1">
                      {quote.items.map((item) => (
                        <li key={item.id}>
                          {item.description} — {Number(item.quantity).toFixed(2)} × {formatCents(item.unitPriceCents)} = {formatCents(item.totalCents)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-4 font-medium">{formatCents(quote.totalCents)}</td>
                </tr>
              ))}
              {quotes.length === 0 ? (
                <tr>
                  <td className="py-6" colSpan={6}>
                    No quotes found.
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
