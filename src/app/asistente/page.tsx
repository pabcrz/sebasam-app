import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireOperationalRole } from "@/lib/auth/session";
import { AssistantChat } from "@/features/assistant/components/assistant-chat";

export const metadata: Metadata = {
  title: "Asistente",
};

export default async function AsistentePage() {
  const { profile } = await requireOperationalRole();

  return (
    <AdminShell displayName={profile.displayName} role={profile.role}>
      <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
            Asistente
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Consultas sobre trabajos históricos: el asistente distingue dato capturado, derivado y
            desconocido, y cita sus fuentes.
          </p>
        </div>
        <AssistantChat />
      </section>
    </AdminShell>
  );
}