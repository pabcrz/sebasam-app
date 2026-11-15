import Link from "next/link";

import { SectionLabel } from "@/components/ui";
import { clsx } from "clsx";
import { inboxRowTone, type InboxRow, type InboxRowKey } from "../inbox-priority";

interface InboxRowsSectionProps {
  heading: string;
  rows: InboxRow[];
  emptyText: string;
}

const ROW_COPY: Record<InboxRowKey, { label: string; caption: string }> = {
  approved: { label: "Asignar trabajos aprobados", caption: "Aceptadas, sin maestro asignado" },
  active: { label: "Completar trabajos activos", caption: "Asignados o en proceso" },
  sent: { label: "Dar seguimiento a cotizaciones enviadas", caption: "Sin respuesta del cliente" },
  draft: { label: "Enviar cotizaciones borrador", caption: "Pendientes de enviar" },
};

/** Shadow-only rows that each open their already-filtered list. Stopped jobs turn amber. */
export function InboxRowsSection({ heading, rows, emptyText }: InboxRowsSectionProps) {
  return (
    <section aria-label={heading} className="grid gap-3">
      <SectionLabel as="h2">{heading}</SectionLabel>
      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-card)]">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const copy = ROW_COPY[row.key];
            const warning = inboxRowTone(row) === "warning";
            const caption = warning ? `${row.stoppedCount} detenido${row.stoppedCount === 1 ? "" : "s"}` : copy.caption;

            return (
              <Link
                key={row.key}
                href={row.href}
                className="group flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-primary)]">
                    {copy.label}
                  </span>
                  <span
                    className={clsx(
                      "block text-xs",
                      warning ? "font-semibold text-[var(--color-status-warning-fg)]" : "text-[var(--color-text-muted)]",
                    )}
                  >
                    {caption}
                  </span>
                </span>
                <span
                  data-numeric-role="count"
                  className={clsx(
                    "shrink-0 text-lg font-bold tabular-nums",
                    warning ? "text-[var(--color-status-warning-fg)]" : "text-[var(--color-text-main)]",
                  )}
                >
                  {row.count}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
