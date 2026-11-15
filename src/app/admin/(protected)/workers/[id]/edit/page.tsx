import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import {
  setWorkerActiveFromForm,
  updateWorkerFromForm,
} from "@/features/workers/actions";
import { WorkerEditForm } from "@/features/workers/components/worker-edit-form";
import { getWorkerById } from "@/features/workers/queries";

export const metadata: Metadata = {
  title: "Editar trabajador",
};

type EditWorkerPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditWorkerPage({ params, searchParams }: EditWorkerPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const worker = await getWorkerById(id);

  if (!worker || !worker.workerKind) {
    notFound();
  }

  const updateWorker = updateWorkerFromForm.bind(null, worker.id);
  const setWorkerActive = setWorkerActiveFromForm.bind(null, worker.id);

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/admin/workers">
          <Icon name="arrow-left" className="h-4 w-4" aria-hidden="true" />
          Regresar a trabajadores
        </Link>
      </Button>

      <AdminPageHeader icon="workers" title={worker.displayName} description="Actualiza los datos del perfil operativo." variant="expanded" />
      <Card>
        <CardHeader>
          {query.error === "invalid" ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Revisa los datos del trabajador e intenta de nuevo.
            </p>
          ) : null}
          {query.error === "duplicate" ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              El usuario o correo interno ya está registrado.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <WorkerEditForm action={updateWorker} worker={worker} />

          <div className="mt-6 border-t border-[var(--color-border-light)] pt-6">
            <p className="text-sm font-medium text-[var(--color-text-main)]">Estado del trabajador</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Desactivar conserva sus asignaciones y registros históricos.
            </p>
            <form action={setWorkerActive} className="mt-3">
              <input type="hidden" name="isActive" value={worker.isActive ? "false" : "true"} />
              <Button type="submit" variant={worker.isActive ? "danger" : "secondary"}>
                {worker.isActive ? "Desactivar trabajador" : "Activar trabajador"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
