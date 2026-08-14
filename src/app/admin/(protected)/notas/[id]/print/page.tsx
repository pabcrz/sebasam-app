import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkOrderById } from "@/features/work-orders/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { formatCents, formatDate, formatVehicle } from "@/features/quotes/lib/format";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Nota de Remisión",
};

type PrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const [workOrder, paymentSettings] = await Promise.all([
    getWorkOrderById(id),
    getPaymentSettings(),
  ]);

  if (!workOrder) {
    notFound();
  }

  const { quote } = workOrder;
  const master = workOrder.assignments.find((a) => a.worker.workerKind === "MASTER");
  const helpers = workOrder.assignments.filter((a) => a.worker.workerKind === "HELPER");

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-black print:p-0 print:max-w-none">
      {/* Print Control Header (hidden on print) */}
      <div className="mb-6 flex items-center justify-between border-b pb-4 print:hidden">
        <div>
          <h1 className="text-lg font-bold">Nota de Remisión / Comprobante de Entrega</h1>
          <p className="text-sm text-gray-600">Orden {workOrder.number} — Cotización {quote.number}</p>
        </div>
        <PrintButton />
      </div>

      {/* Printable Document */}
      <div className="border border-gray-300 p-8 print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-300 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{paymentSettings.name}</h1>
            <p className="text-xs text-gray-600">{paymentSettings.fullName}</p>
            <p className="mt-1 text-xs text-gray-500 max-w-md">{paymentSettings.address}</p>
            <p className="mt-1 text-xs text-gray-500">Tel: {paymentSettings.contactPhone} · WhatsApp: {paymentSettings.contactWhatsapp}</p>
          </div>
          <div className="text-right">
            <div className="inline-block rounded border border-gray-800 bg-gray-50 px-3 py-1 text-center">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">NOTA DE REMISIÓN</p>
              <p className="text-lg font-extrabold font-mono text-gray-900">{workOrder.number}</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">Cotización de origen: <span className="font-semibold">{quote.number}</span></p>
            <p className="text-xs text-gray-500">Fecha de emisión: {formatDate(new Date())}</p>
            {workOrder.completedAt ? (
              <p className="text-xs text-gray-500">Fecha de entrega: {formatDate(workOrder.completedAt)}</p>
            ) : null}
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded border border-gray-200 bg-gray-50 p-4 text-xs">
          <div>
            <p className="font-bold text-gray-700 uppercase tracking-wider">DATOS DEL CLIENTE</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{quote.customer.name}</p>
            {quote.customer.phone ? <p className="text-gray-600">Tel: {quote.customer.phone}</p> : null}
            {quote.customer.email ? <p className="text-gray-600">Email: {quote.customer.email}</p> : null}
          </div>
          <div>
            <p className="font-bold text-gray-700 uppercase tracking-wider">VEHÍCULO & ASIGNACIÓN</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {quote.vehicle ? formatVehicle(quote.vehicle) : "Sin vehículo"}
            </p>
            <p className="mt-1 text-gray-600">
              <span className="font-semibold">Responsable del trabajo: </span>
              {workOrder.isSpecial ? (
                <span>Taller</span>
              ) : master ? (
                <span>{master.worker.displayName} (Maestro)</span>
              ) : (
                <span>Sin maestro asignado</span>
              )}
            </p>
            {helpers.length > 0 ? (
              <p className="text-gray-600">
                <span className="font-semibold">Ayudantes: </span>
                {helpers.map((h) => h.worker.displayName).join(", ")}
              </p>
            ) : null}
          </div>
        </div>

        {/* Work Description Title */}
        <div className="mt-6 mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">DESGLOSE DE TRABAJOS Y CONCEPTOS</h2>
          <p className="text-xs text-gray-500">{quote.title}</p>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-xs border-collapse border border-gray-200 mt-2">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-2 font-bold uppercase text-gray-600">Cant.</th>
              <th className="p-2 font-bold uppercase text-gray-600">Concepto / Servicio realizado</th>
              <th className="p-2 text-right font-bold uppercase text-gray-600">P. Unitario</th>
              <th className="p-2 text-right font-bold uppercase text-gray-600">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="p-2 font-mono">{Number(item.quantity)}</td>
                <td className="p-2">{item.description}</td>
                <td className="p-2 text-right font-mono">{formatCents(Number(item.unitPriceCents))}</td>
                <td className="p-2 text-right font-mono font-semibold">{formatCents(Number(item.totalCents))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCents(Number(quote.subtotalCents))}</span>
            </div>
            {quote.discountCents > 0 ? (
              <div className="flex justify-between text-[var(--color-status-success-fg)]">
                <span>Descuento:</span>
                <span className="font-mono">-{formatCents(Number(quote.discountCents))}</span>
              </div>
            ) : null}
            {quote.taxEnabled ? (
              <div className="flex justify-between text-gray-600">
                <span>IVA (16%):</span>
                <span className="font-mono">{formatCents(Number(quote.taxCents))}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-gray-800 pt-2 text-sm font-extrabold text-gray-900">
              <span>TOTAL REAL:</span>
              <span className="font-mono">{formatCents(Number(quote.totalCents))}</span>
            </div>
          </div>
        </div>

        {/* Signatures & Notes */}
        <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="font-semibold text-gray-700">Firma del Maestro / Taller</p>
            <p className="text-gray-500 text-[0.65rem]">{workOrder.isSpecial ? "Taller" : master?.worker.displayName ?? paymentSettings.name}</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-2 h-12"></div>
            <p className="font-semibold text-gray-700">Firma de Conformidad del Cliente</p>
            <p className="text-gray-500 text-[0.65rem]">{quote.customer.name}</p>
          </div>
        </div>

        <p className="mt-8 text-center text-[0.65rem] text-gray-400">
          Este documento constituye la Nota de Remisión y Comprobante de Entrega del servicio realizado por {paymentSettings.name}.
        </p>
      </div>
    </div>
  );
}
