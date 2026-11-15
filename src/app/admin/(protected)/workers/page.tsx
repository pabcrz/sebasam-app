import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button, Input, PageHeader, SegmentedControl } from "@/components/ui";
import {
  createWorkerFromForm,
  deleteWorkerFromForm,
  setWorkerActiveFromForm,
  updateWorkerFromForm,
} from "@/features/workers/actions";

import { WorkerCreateDialog } from "@/features/workers/components/worker-create-dialog";
import { WorkerCardList } from "@/features/workers/components/worker-card-list";
import { listWorkers } from "@/features/workers/queries";
import { workerSearchSchema } from "@/features/workers/schemas";

export const metadata: Metadata = {
  title: "Trabajadores",
};

type WorkersPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
    q?: string;
    status?: string;
    updated?: string;
  }>;
};

const statusLabels = {
  ALL: "Todos",
  ACTIVE: "Activos",
  INACTIVE: "Inactivos",
} as const;

function workersHref(status: string, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("status", status);
  return `/admin/workers?${params.toString()}`;
}

export default async function WorkersPage({ searchParams }: WorkersPageProps) {
  const params = await searchParams;
  const parsedSearch = workerSearchSchema.safeParse({ query: params.q, status: params.status });
  const search = parsedSearch.success ? parsedSearch.data : { query: "", status: "ALL" as const };
  const workers = await listWorkers(search);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      {params.created ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
          Trabajador creado.
        </p>
      ) : null}
      {params.updated ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
          Trabajador actualizado.
        </p>
      ) : null}
      {params.error === "invalid" ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
          Revisa los datos del trabajador e intenta de nuevo.
        </p>
      ) : null}
      {params.error === "duplicate" ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
          El usuario o correo interno ya está registrado.
        </p>
      ) : null}

      <PageHeader
        title="Trabajadores"
        primaryAction={
          <WorkerCreateDialog action={createWorkerFromForm} triggerVariant="primary" triggerSize="lg" />
        }
      />

      <div className="grid gap-3">
        <form className="flex min-w-0 items-center gap-2">
          <input type="hidden" name="status" value={search.status} />
          <Input
            name="q"
            defaultValue={search.query}
            placeholder="Buscar por nombre, usuario o correo"
            aria-label="Buscar trabajadores"
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            label="Filtrar trabajadores"
            value={search.status}
            options={Object.entries(statusLabels).map(([value, label]) => ({
              value,
              label,
              href: workersHref(value, search.query),
            }))}
          />
          {search.query || search.status !== "ALL" ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/workers">
                <Icon name="close" className="h-4 w-4" aria-hidden="true" />
                Limpiar
              </Link>
            </Button>
          ) : null}
        </div>

        <WorkerCardList
          workers={workers}
          updateAction={updateWorkerFromForm}
          setActiveAction={setWorkerActiveFromForm}
          deleteAction={deleteWorkerFromForm}
        />
      </div>
    </section>
  );
}
