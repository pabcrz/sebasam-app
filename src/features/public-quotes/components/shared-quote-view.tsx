"use client";

import { Badge } from "@/components/ui";
import { QuotePreviewCard } from "@/features/quotes/components/quote-preview-card";
import { formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import type { Quote, QuoteItem, Customer, Vehicle } from "@prisma/client";

export interface SharedQuoteViewProps {
  quote: Quote & {
    customer: Customer;
    vehicle: Vehicle | null;
    items: QuoteItem[];
  };
}

export function SharedQuoteView({ quote }: SharedQuoteViewProps) {
  const vehicleDescription = quote.vehicle
    ? formatVehicle(quote.vehicle)
    : formatSnapshotVehicle(quote.vehicleSnapshot);

  const hasVehicle = vehicleDescription !== "Sin vehículo";
  const vehicleParts = hasVehicle ? vehicleDescription.split(" — ") : [];
  const vehicle = {
    plate: vehicleParts[0] ?? "",
    brand: vehicleParts[1] ?? "",
    model: vehicleParts[2] ?? "",
    year: vehicleParts[3] ?? "",
  };

  const items = quote.items.map((item) => ({
    type: item.type,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unitPrice: String(item.unitPriceCents / 100),
  }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">COTIZACIÓN</p>
          <p className="text-lg font-bold text-[var(--color-text-main)]">{quote.number}</p>
        </div>
        <Badge variant="info">{quoteStatusLabels[quote.status]}</Badge>
      </div>

      <QuotePreviewCard
        customerName={quote.customer.name}
        vehicle={vehicle}
        title={quote.title}
        description={quote.description ?? ""}
        administrative={quote.administrative}
        items={items}
        subtotalCents={Number(quote.subtotalCents)}
        taxCents={Number(quote.taxCents)}
        totalCents={Number(quote.totalCents)}
        validUntil={quote.validUntil}
      />
    </div>
  );
}
