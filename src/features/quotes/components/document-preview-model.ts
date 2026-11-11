import type { DocumentPreviewProps, DocumentPreviewSection } from "@/components/document-preview";
import { formatUnitIdentity } from "@/lib/unit-identity";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { formatQuantity } from "./quote-builder-shared";
import type { QuotePreviewCardProps } from "./quote-preview-card";
import { resolveQuotePreviewFigures } from "./quote-preview-figures";

/**
 * Maps the quote preview input to the shared `DocumentPreview` props for the
 * in-app hosts. Totals and section subtotals come from the same figures the
 * public card and print view use.
 */
export function toDocumentPreviewProps(
  card: QuotePreviewCardProps,
  options: { typeLabel?: string; statusLabel?: string | null } = {},
): DocumentPreviewProps {
  const figures = resolveQuotePreviewFigures({
    sections: card.sections,
    subtotalCents: card.subtotalCents,
    discountCents: card.discountCents,
    taxCents: card.taxCents,
    totalCents: card.totalCents,
    isApproved: card.isApproved,
  });

  const sections: DocumentPreviewSection[] = figures.visibleSections.map(({
    section,
    sectionIndex,
    displayItems,
    isSelected,
    sectionSubtotalCents,
    showsBadge,
  }) => ({
    id: section.id ?? `section-${sectionIndex}`,
    name: section.name || `Sección ${sectionIndex + 1}`,
    subtotalCents: sectionSubtotalCents,
    badge: showsBadge ? "Autorizada" : null,
    muted: !isSelected,
    rows: displayItems.map((item, itemIndex) => {
      const quantityNum = Number(item.quantity);
      const unitPriceCents = item.unitPrice.trim() ? Number(item.unitPrice) * 100 : null;
      const isServiceOrLaborSingle = item.type === "LABOR" && quantityNum === 1;
      const showUnitDetail = quantityNum > 1 && unitPriceCents != null;

      return {
        id: String(itemIndex),
        quantityLabel: isServiceOrLaborSingle || quantityNum === 0 ? "" : formatQuantity(item.quantity),
        description: item.description,
        unitDetailLabel: showUnitDetail
          ? `${formatQuantity(item.quantity)} × ${formatCents(unitPriceCents)} c/u`
          : null,
        lineTotalCents: item.unitPrice.trim() ? Math.round(quantityNum * Number(item.unitPrice) * 100) : null,
      };
    }),
  }));

  const vehicle = card.vehicle;
  const unitModel = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");

  return {
    typeLabel: options.typeLabel ?? (card.isNote ? "Nota" : "Cotización"),
    statusLabel: options.statusLabel ?? null,
    administrative: card.administrative,
    customer: { name: card.customerName, legalName: card.legalName },
    contactLine: card.contactName
      ? `${card.contactRole ? `${card.contactRole}: ` : "Contacto: "}${card.contactName}`
      : null,
    unitLine: formatUnitIdentity({
      economicNumber: vehicle.economicNumber,
      plates: vehicle.plate,
      model: unitModel,
    }),
    service: card.title || null,
    sections,
    showSectionHeaders: figures.hasMultipleSections || figures.visibleSections.some((s) => s.showsBadge),
    totals: {
      subtotalCents: figures.displaySubtotalCents,
      discountCents: card.discountCents ?? 0,
      taxCents: figures.displayTaxCents,
      totalCents: figures.displayTotalCents,
      partialNotice: figures.partialNotice,
    },
    notes: card.description || null,
    validityText: card.isNote
      ? null
      : `Vigente hasta el ${card.validUntil ? formatDate(card.validUntil) : "—"}. Los precios están sujetos a cambios imprevistos en el costo de materiales.`,
    dueDateText: card.isNote && card.paymentDueDate
      ? `Fecha de vencimiento de pago: ${formatDate(card.paymentDueDate)}.`
      : null,
  };
}
