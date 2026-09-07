import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Badge, Card, SectionLabel } from "@/components/ui";
import type { PendingAttentionItem } from "../types";

interface PendingAttentionSectionProps {
  items?: PendingAttentionItem[];
}

export function PendingAttentionSection({ items = [] }: PendingAttentionSectionProps) {
  return (
    <section aria-labelledby="pending-attention-heading">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
        <SectionLabel id="pending-attention-heading">Por atender</SectionLabel>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-6 text-center border-dashed">
          <CheckCircle2 className="h-8 w-8 text-[var(--color-status-success)] mb-2" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--color-text-main)]">
            Nada pendiente por ahora
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Todas las cotizaciones y trabajos activos están al día.
          </p>
        </Card>
      ) : (
        <div className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-xs">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="group flex flex-col gap-2 p-3.5 transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] truncate">
                    {item.customerName}
                  </span>
                  <Badge variant={item.statusVariant} className="text-[0.7rem] py-0.5 px-2">
                    {item.statusLabel}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                  {item.vehicleDescription}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-[var(--color-border-light)]/60 pt-2 sm:border-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span className="text-[0.65rem] uppercase font-bold tracking-wider text-[var(--color-text-muted)] block">
                    Siguiente paso
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-primary)]">
                    {item.nextStep}
                  </span>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
