import Link from "next/link";

import { Badge, Button, EntityCard, EntityCardDataRow, Icon, SectionLabel } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { formatUnitIdentity } from "@/lib/unit-identity";
import type { NextWorkQuote } from "../types";

interface NextWorkCardProps {
  nextWork: NextWorkQuote;
}

type ToolIcon = "edit" | "print" | "share" | "more";

/** Icon-only footer tool, sized like the quote card's tools. */
function ToolLink({ href, label, icon }: { href: string; label: string; icon: ToolIcon }) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 justify-center gap-0 px-0"
    >
      <Link href={href} aria-label={label} title={label}>
        <Icon name={icon} className="h-5 w-5" aria-hidden="true" />
      </Link>
    </Button>
  );
}

/** The oldest approved quote without a work order, featured with its assignment action. */
export function NextWorkCard({ nextWork }: NextWorkCardProps) {
  const unit = formatUnitIdentity({
    economicNumber: nextWork.vehicle?.economicNumber,
    plates: nextWork.vehicle?.plate,
    model: [nextWork.vehicle?.brand, nextWork.vehicle?.model].filter(Boolean).join(" "),
  });
  // The query only returns quotes with no work order in ASSIGNED, IN_PROGRESS or COMPLETED,
  // so no master is assigned yet for any card shown here.
  const quoteListHref = `/admin/quotes?number=${encodeURIComponent(nextWork.number)}`;

  return (
    <section aria-labelledby="next-work-heading" className="grid gap-3">
      <SectionLabel as="h2" id="next-work-heading" className="flex items-center gap-2 text-[var(--color-primary)]">
        <Icon name="wrench" className="h-4 w-4" aria-hidden="true" />
        Siguiente trabajo
      </SectionLabel>
      <EntityCard
        variant="featured"
        openLabel={`Siguiente trabajo: ${nextWork.title}`}
        title={nextWork.title}
        folio={nextWork.number}
        status={<Badge variant="success">Aceptada</Badge>}
        amount={nextWork.totalCents != null ? formatCents(nextWork.totalCents) : null}
        customer={nextWork.customerName}
        unit={unit}
        keyData={<EntityCardDataRow label="Maestro" value="Sin asignar" />}
        editAction={<ToolLink href={quoteListHref} label={`Editar ${nextWork.number}`} icon="edit" />}
        printAction={
          <ToolLink href={`/admin/quotes/${nextWork.quoteId}/print?returnTo=/admin`} label={`Imprimir ${nextWork.number}`} icon="print" />
        }
        shareAction={<ToolLink href={quoteListHref} label={`Compartir ${nextWork.number}`} icon="share" />}
        overflowAction={<ToolLink href={quoteListHref} label={`Más acciones ${nextWork.number}`} icon="more" />}
        stateAction={
          <Button asChild variant="tonal" size="default">
            <Link href="/admin/quotes?status=APPROVED">
              <Icon name="user-plus" className="h-4 w-4" aria-hidden="true" />
              Asignar
            </Link>
          </Button>
        }
      />
    </section>
  );
}
