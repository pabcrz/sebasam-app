import Link from "next/link";

import { Badge, Button, EntityCard, SectionLabel } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { formatUnitIdentity } from "@/lib/unit-identity";
import type { NextWorkQuote } from "../types";

interface NextWorkCardProps {
  nextWork: NextWorkQuote;
}

/** The oldest approved quote without a work order, featured with its assignment action. */
export function NextWorkCard({ nextWork }: NextWorkCardProps) {
  const unit = formatUnitIdentity({
    economicNumber: nextWork.vehicle?.economicNumber,
    plates: nextWork.vehicle?.plate,
    model: [nextWork.vehicle?.brand, nextWork.vehicle?.model].filter(Boolean).join(" "),
  });

  return (
    <section aria-labelledby="next-work-heading" className="grid gap-3">
      <SectionLabel as="h2" id="next-work-heading">
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
        stateAction={
          <Button asChild variant="tonal" size="default">
            <Link href="/admin/quotes?status=APPROVED">Asignar</Link>
          </Button>
        }
      />
    </section>
  );
}
