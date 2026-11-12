import Link from "next/link";

import { Icon, SectionLabel } from "@/components/ui";
import type { IconName } from "@/components/ui/icon";
import { clsx } from "clsx";
import { inboxRowTone, type InboxRow, type InboxRowKey } from "../inbox-priority";

interface InboxRowsSectionProps {
  heading: string;
  rows: InboxRow[];
  emptyText: string;
}

const ROW_COPY: Record<InboxRowKey, { label: string; caption: string; icon: IconName }> = {
  approved: { label: "Asignar trabajos aprobados", caption: "Aceptadas, sin maestro asignado", icon: "clipboard" },
  active: { label: "Completar trabajos activos", caption: "Asignados o en proceso", icon: "jobs" },
  sent: { label: "Dar seguimiento a cotizaciones enviadas", caption: "Sin respuesta del cliente", icon: "clock" },
  draft: { label: "Enviar cotizaciones borrador", caption: "Pendientes de enviar", icon: "file-edit" },
};

/**
 * One group of the inbox as divided rows; the parent provides the single surface.
 * Each row opens its already-filtered list. Icons carry no box; stopped jobs turn amber.
 */
export function InboxRowsSection({ heading, rows, emptyText }: InboxRowsSectionProps) {
  return (
    <section aria-label={heading} className="grid gap-1 px-4 py-3">
      <SectionLabel as="h2">{heading}</SectionLabel>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-[var(--color-text-muted)]">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-light)]">
          {rows.map((row) => {
            const copy = ROW_COPY[row.key];
            const warning = inboxRowTone(row) === "warning";
            const caption = warning ? `${row.stoppedCount} detenido${row.stoppedCount === 1 ? "" : "s"}` : copy.caption;
            const tone = warning ? "text-[var(--color-status-warning-fg)]" : "text-[var(--color-text-muted)]";

            return (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="group flex min-h-[var(--tap-min-height)] min-w-0 items-center gap-3 py-2 transition-colors hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]"
                >
                  <Icon name={copy.icon} className={clsx("h-4 w-4 shrink-0", tone)} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span
                      className={clsx(
                        "block truncate text-sm font-semibold",
                        warning ? "text-[var(--color-status-warning-fg)]" : "text-[var(--color-text-main)]",
                      )}
                    >
                      {copy.label}
                    </span>
                    <span className={clsx("block text-xs", warning ? "font-semibold" : "", tone)}>{caption}</span>
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
