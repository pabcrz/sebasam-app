"use client";

import * as React from "react";
import { Eye, X } from "lucide-react";
import { loadQuoteDetailAction } from "@/features/quotes/actions";
import type { QuoteDetail, QuoteListSummary } from "@/features/quotes/queries";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { QuotePreviewCard, type QuotePreviewCardProps } from "./quote-preview-card";

type QuoteReference = Pick<QuoteListSummary, "id" | "number">;

interface QuotePreviewDialogProps {
  quote: QuoteReference;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function toQuotePreviewCardProps(quote: QuoteDetail): QuotePreviewCardProps {
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const snapshotValue = (key: string) => snapshot[key] == null ? "" : String(snapshot[key]);

  // Build sections from DB items — group by section if available, else one default section
  const sections = quote.sections && quote.sections.length > 0
    ? quote.sections.map((section) => ({
        name: section.name,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPriceCents) / 100),
          rowIds: [],
        })),
        rowIds: [],
      }))
    : [{
        name: "General",
        items: quote.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(Number(item.unitPriceCents) / 100),
        })),
        rowIds: [],
      }];

  return {
    customerName: quote.customer.name,
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
    subtotalCents: Number(quote.subtotalCents),
    discountCents: Number(quote.discountCents),
    taxCents: Number(quote.taxCents),
    totalCents: Number(quote.totalCents),
    paidCents: quote.paidCents,
    remainingCents: quote.remainingCents,
    validUntil: quote.validUntil,
  };
}


export function QuotePreviewDialog({ quote, open: openProp, onOpenChange, showTrigger = true }: QuotePreviewDialogProps) {
  const [openInternal, setOpenInternal] = React.useState(false);
  const [detail, setDetail] = React.useState<QuoteDetail | null>(null);
  const [failure, setFailure] = React.useState<{ quoteId: string; message: string } | null>(null);
  const [retry, setRetry] = React.useState(0);
  const open = openProp ?? openInternal;
  const error = failure?.quoteId === quote.id ? failure.message : null;
  const loading = open && !error && detail?.id !== quote.id;
  const resetDetail = React.useCallback(() => {
    setDetail(null);
    setFailure(null);
  }, []);
  const setOpen = React.useCallback(
    (value: boolean) => {
      resetDetail();
      setOpenInternal(value);
      onOpenChange?.(value);
    },
    [onOpenChange, resetDetail],
  );
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    void loadQuoteDetailAction(quote.id)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) setFailure({ quoteId: quote.id, message: "No se pudo cargar la cotización. Intenta de nuevo." });
      });

    return () => {
      active = false;
    };
  }, [open, quote.id, retry]);

  const preview = detail?.id === quote.id ? toQuotePreviewCardProps(detail) : null;
  const retryDetail = () => {
    resetDetail();
    setRetry((attempt) => attempt + 1);
  };

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

        {loading ? <p role="status" className="py-8 text-center text-sm text-[var(--color-text-muted)]">Cargando cotización...</p> : null}
        {error ? (
          <div role="alert" className="grid gap-3 py-4 text-sm text-[var(--color-status-danger-fg)]">
            <p>{error}</p>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={retryDetail}>
              Reintentar
            </Button>
          </div>
        ) : null}
        {preview ? <QuotePreviewCard {...preview} /> : null}
      </DialogContent>
    </Dialog>
  );
}
