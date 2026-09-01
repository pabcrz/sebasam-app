"use client";

import * as React from "react";
import { Eye, Printer, X } from "lucide-react";
import Link from "next/link";
import type { QuoteListSummary } from "@/features/quotes/queries";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { QuotePreviewCard, type QuotePreviewCardProps } from "./quote-preview-card";

export type QuotePreviewSummary = Pick<QuoteListSummary, "id" | "number" | "vehicleSnapshot" | "title" | "description" | "administrative" | "subtotalCents" | "discountCents" | "taxCents" | "totalCents" | "paidCents" | "remainingCents" | "validUntil"> & {
  customer: Pick<NonNullable<QuoteListSummary["customer"]>, "name"> | null;
  vehicle: Pick<NonNullable<QuoteListSummary["vehicle"]>, "plate" | "brand" | "model" | "year"> | null;
  workOrder?: Pick<NonNullable<QuoteListSummary["workOrder"]>, "id" | "status"> | null;
  items: Array<{ sectionId: string | null; type: QuoteListSummary["items"][number]["type"]; description: string; quantity: unknown; unitPriceCents: unknown }>;
  sections: Array<{ name: string; items: Array<{ type: QuoteListSummary["items"][number]["type"]; description: string; quantity: unknown; unitPriceCents: unknown }> }>;
};

interface QuotePreviewDialogProps {
  quote: QuotePreviewSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  noteReturnTo?: string;
}

export function toQuotePreviewCardProps(quote: QuotePreviewSummary): QuotePreviewCardProps {
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const snapshotValue = (key: string) => snapshot[key] == null ? "" : String(snapshot[key]);

  // Preserve root items and section items as independent renderable sections.
  const rootItems = quote.items.filter((item) => item.sectionId === null);
  const rootSection = rootItems.length > 0
    ? [{
        name: "General",
        items: rootItems.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(Number(item.unitPriceCents) / 100),
        })),
        rowIds: [],
      }]
    : [];
  const sectionItems = quote.sections.map((section) => ({
        name: section.name,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(Number(item.unitPriceCents) / 100),
          rowIds: [],
        })),
        rowIds: [],
      }));
  const sections = [...rootSection, ...sectionItems];

  return {
    customerName: quote.customer?.name ?? "",
    vehicle: {
      plate: quote.vehicle?.plate ?? snapshotValue("plate"),
      brand: quote.vehicle?.brand ?? snapshotValue("brand"),
      model: quote.vehicle?.model ?? snapshotValue("model"),
      year: quote.vehicle?.year != null ? String(quote.vehicle.year) : snapshotValue("year"),
    },
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    sections,
    subtotalCents: quote.subtotalCents == null ? null : Number(quote.subtotalCents),
    discountCents: Number(quote.discountCents),
    taxCents: quote.taxCents == null ? null : Number(quote.taxCents),
    totalCents: quote.totalCents == null ? null : Number(quote.totalCents),
    paidCents: quote.paidCents,
    remainingCents: quote.remainingCents,
    validUntil: quote.validUntil,
    compactItems: true,
  };
}


export function QuotePreviewDialog({ quote, open: openProp, onOpenChange, showTrigger = true, noteReturnTo = "/admin/notas" }: QuotePreviewDialogProps) {
  const [openInternal, setOpenInternal] = React.useState(false);
  const open = openProp ?? openInternal;
  const setOpen = React.useCallback(
    (value: boolean) => {
      setOpenInternal(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const preview = toQuotePreviewCardProps(quote);
  const printHref = quote.workOrder?.status === "COMPLETED"
    ? `/admin/notas/${quote.workOrder.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`
    : `/admin/quotes/${quote.id}/print?returnTo=/admin/quotes`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Ver vista previa de ${quote.number}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Ver</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader className="relative">
          <DialogTitle>Cotización {quote.number}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>

        <QuotePreviewCard {...preview} />
        <Button asChild type="button" variant="primary" size="sm" className="!h-11 !w-11 min-h-11 min-w-11 px-0 sm:!h-9 sm:!w-auto sm:px-3">
          <Link href={printHref}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Imprimir cotización</span>
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
