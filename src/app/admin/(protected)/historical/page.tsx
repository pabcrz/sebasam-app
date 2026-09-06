import type { Metadata } from "next";
import { ImportFlow } from "@/features/historical/components/import-flow";
import { listActiveMasters } from "@/features/workers/queries";

export const metadata: Metadata = {
  title: "Histórico",
};

export default async function HistoricalPage() {
  const masters = await listActiveMasters();

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Carga de histórico
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Importá trabajos de la libreta (dictado por voz, texto o Excel) en formato JSON
          schemaVersion 2. Cada trabajo se guarda completo en una sola transacción.
        </p>
      </div>
      <ImportFlow masters={masters} />
    </section>
  );
}