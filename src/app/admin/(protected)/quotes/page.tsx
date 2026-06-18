import type { Metadata } from "next";
import { QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { approveQuoteAndCreateWorkOrderFromForm, createQuoteFromForm } from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type QuotesPageProps = {
  searchParams: Promise<{
    approved?: string;
    created?: string;
    error?: string;
  }>;
};

const itemTypes = Object.values(QuoteItemType);
const itemRows = Array.from({ length: 5 }, (_, index) => index);

const itemTypeLabels: Record<QuoteItemType, string> = {
  SERVICE: "Servicio",
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  OTHER: "Otro",
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "Planeada",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

type VehicleSnapshotView = {
  plate?: unknown;
  brand?: unknown;
  model?: unknown;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

function formatSnapshotVehicle(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "Sin vehículo";
  }

  const vehicle = snapshot as VehicleSnapshotView;
  const plate = typeof vehicle.plate === "string" && vehicle.plate.trim() !== "" ? vehicle.plate : "Sin placas";
  const brand = typeof vehicle.brand === "string" ? vehicle.brand : "";
  const model = typeof vehicle.model === "string" ? vehicle.model : "";
  const description = [brand, model].filter(Boolean).join(" ");

  return description ? `${plate} — ${description}` : plate;
}

function formatVehicle(vehicle: { plate: string | null; brand: string | null; model: string }) {
  const plate = vehicle.plate?.trim() || "Sin placas";
  const description = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return description ? `${plate} — ${description}` : plate;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const [customers, quotes] = await Promise.all([listCustomers(), listQuotes()]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10">
      <div className="border p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Gestión de cotizaciones</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cotizaciones en borrador</h1>
        <p className="mt-4 max-w-2xl leading-7 text-neutral-600">
          Crea cotizaciones en borrador para clientes existentes con subtotales y totales calculados en el servidor.
        </p>
        {params.created ? <p className="mt-4 text-sm">Cotización en borrador creada.</p> : null}
        {params.approved ? <p className="mt-4 text-sm">Cotización aprobada y orden de trabajo creada.</p> : null}
        {params.error === "invalid" ? (
          <p className="mt-4 text-sm" role="alert">
            Revisa los datos de la cotización e incluye al menos una partida completa.
          </p>
        ) : null}
        {params.error === "invalid-approval" ? (
          <p className="mt-4 text-sm" role="alert">
            Selecciona una cotización válida antes de aprobar.
          </p>
        ) : null}
        {params.error === "duplicate-work-order" ? (
          <p className="mt-4 text-sm" role="alert">
            Esta cotización ya tiene una orden de trabajo.
          </p>
        ) : null}
        {params.error === "approval-failed" ? (
          <p className="mt-4 text-sm" role="alert">
            No se pudo aprobar la cotización. Recarga y confirma que siga en borrador.
          </p>
        ) : null}
      </div>

      <form action={createQuoteFromForm} className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Crear cotización en borrador</h2>
        <label className="grid gap-2">
          <span>Cliente</span>
          <select name="customerId" required className="border px-3 py-2" defaultValue="">
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span>Título</span>
          <input name="title" required className="border px-3 py-2" />
        </label>
        <label className="grid gap-2">
          <span>Descripción</span>
          <textarea name="description" className="border px-3 py-2" rows={3} />
        </label>
        <fieldset className="grid gap-3 border p-4">
          <legend className="px-1 text-sm font-medium">Vehículo</legend>
          <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_140px_120px]">
            <label className="grid gap-2">
              <span>Placas (opcional)</span>
              <input name="plate" className="border px-3 py-2" />
            </label>
            <label className="grid gap-2">
              <span>Marca (opcional)</span>
              <input name="brand" className="border px-3 py-2" />
            </label>
            <label className="grid gap-2">
              <span>Modelo</span>
              <input name="model" required className="border px-3 py-2" />
            </label>
            <label className="grid gap-2">
              <span>Color</span>
              <input name="color" className="border px-3 py-2" />
            </label>
            <label className="grid gap-2">
              <span>Año</span>
              <input name="year" type="number" min="1900" max={new Date().getFullYear() + 1} className="border px-3 py-2" />
            </label>
          </div>
        </fieldset>
        <label className="flex items-center gap-2">
          <input name="administrative" type="checkbox" />
          <span>Cotización administrativa</span>
        </label>

        <div className="grid gap-3">
          <h3 className="font-semibold">Partidas</h3>
          {itemRows.map((index) => (
            <fieldset key={index} className="grid gap-3 border p-4">
              <legend className="px-1 text-sm font-medium">Partida {index + 1}</legend>
              <div className="grid gap-3 md:grid-cols-[160px_1fr_120px_160px]">
                <label className="grid gap-2">
                  <span>Tipo</span>
                  <select name={`items.${index}.type`} className="border px-3 py-2" defaultValue="SERVICE">
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>
                        {itemTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span>Descripción</span>
                  <input name={`items.${index}.description`} className="border px-3 py-2" />
                </label>
                <label className="grid gap-2">
                  <span>Cantidad</span>
                  <input
                    name={`items.${index}.quantity`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="border px-3 py-2"
                  />
                </label>
                <label className="grid gap-2">
                  <span>Precio unitario</span>
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
          Crear cotización en borrador
        </button>
      </form>

      <div className="grid gap-4 border p-6">
        <h2 className="text-xl font-semibold">Cotizaciones recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 pr-4">Número</th>
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">Vehículo</th>
                <th className="py-3 pr-4">Título</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Orden de trabajo</th>
                <th className="py-3 pr-4">Partidas</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b align-top">
                  <td className="py-3 pr-4 font-medium">{quote.number}</td>
                  <td className="py-3 pr-4">{quote.customer.name}</td>
                  <td className="py-3 pr-4">
                    {quote.vehicle ? formatVehicle(quote.vehicle) : formatSnapshotVehicle(quote.vehicleSnapshot)}
                  </td>
                  <td className="py-3 pr-4">{quote.title}</td>
                  <td className="py-3 pr-4">{quoteStatusLabels[quote.status]}</td>
                  <td className="py-3 pr-4">
                    {quote.workOrder ? (
                      <span>
                        {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
                      </span>
                    ) : (
                      <span>Ninguna</span>
                    )}
                  </td>
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
                  <td className="py-3 pr-4">
                    {quote.status === "DRAFT" && !quote.workOrder ? (
                      <form action={approveQuoteAndCreateWorkOrderFromForm}>
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <button type="submit" className="border px-3 py-2 font-medium">
                          Aprobar y crear orden de trabajo
                        </button>
                      </form>
                    ) : (
                      <span>Sin acción</span>
                    )}
                  </td>
                </tr>
              ))}
              {quotes.length === 0 ? (
                <tr>
                  <td className="py-6" colSpan={9}>
                    No se encontraron cotizaciones.
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
