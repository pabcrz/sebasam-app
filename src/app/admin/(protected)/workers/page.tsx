import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import {
  createWorkerFromForm,
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

export default async function WorkersPage({ searchParams }: WorkersPageProps) {
  const params = await searchParams;
  const parsedSearch = workerSearchSchema.safeParse({ query: params.q, status: params.status });
  const search = parsedSearch.success ? parsedSearch.data : { query: "", status: "ALL" as const };
  const workers = await listWorkers(search);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] md:text-3xl">
          Trabajadores
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Administra el catálogo operativo de maestros y ayudantes.
        </p>
      </div>

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

      <div>
        <WorkerCreateDialog action={createWorkerFromForm} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            Buscar trabajadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              name="q"
              defaultValue={search.query}
              placeholder="Buscar por nombre, usuario o correo"
            />
            <select
              name="status"
              defaultValue={search.status}
              aria-label="Filtrar por estado"
              className="min-h-[var(--tap-min-height)] rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-base text-[var(--color-text-main)]"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
              {search.query || search.status !== "ALL" ? (
                <Button asChild variant="outline">
                  <Link href="/admin/workers">
                    <X className="h-4 w-4" aria-hidden="true" />
                    Limpiar
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6">
            <WorkerCardList
              workers={workers}
              updateAction={updateWorkerFromForm}
              setActiveAction={setWorkerActiveFromForm}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
