"use client";

import * as React from "react";

import { Badge } from "@/components/ui";
import { Truck, UserRound } from "lucide-react";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { formatQuantity, SectionFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";
import { QuotePaymentBalanceIndicator } from "./quote-payment-balance-indicator";

export interface QuotePreviewCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  sections: SectionFormValue[];
  subtotalCents: number | null;
  discountCents?: number;
  taxCents: number | null;
  totalCents: number | null;
  paidCents?: number | null;
  remainingCents?: number | null;
  validUntil: Date | null;
  isNote?: boolean;
  isPrint?: boolean;
  isApproved?: boolean;
  compactHeader?: boolean;
  /** When provided, sections become selectable (partial authorization). */
  selectableSectionIds?: string[];
  onSectionToggle?: (sectionId: string, selected: boolean) => void;
}

// PreviewItemRow is removed because we use a <table> directly

export function QuotePreviewCard({
  customerName,
  vehicle,
  title,
  description,
  administrative,
  sections,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  paidCents,
  remainingCents,
  validUntil,
  isNote,
  isPrint,
  isApproved,
  compactHeader,
  selectableSectionIds,
  onSectionToggle,
}: QuotePreviewCardProps) {
  const vehicleDescription = [vehicle.brand, vehicle.model, vehicle.year, vehicle.plate]
    .filter(Boolean)
    .join(" · ");

  const hasMultipleSections = sections.length > 1;
  const hasPendingPrice = sections.some((section) => section.items.some((item) => item.description.trim() && item.unitPrice.trim() === ""));

  const hasPartialApproval = Boolean(isApproved) && sections.some((s) => s.isAuthorized === true) && sections.some((s) => s.isAuthorized === false);

  // Calculate full totals across ALL sections
  const allSectionsSubtotalCents = sections.reduce((acc, section) => {
    const completeItems = section.items.filter((item) => item.description.trim() && item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
    return acc + completeItems.reduce((secAcc, item) => secAcc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100), 0);
  }, 0);

  // Calculate authorized-only totals when approved with partial authorization
  const authorizedSectionsSubtotalCents = sections
    .filter((s) => s.isAuthorized)
    .reduce((acc, section) => {
      const completeItems = section.items.filter((item) => item.description.trim() && item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
      return acc + completeItems.reduce((secAcc, item) => secAcc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100), 0);
    }, 0);

  const discountVal = discountCents ?? 0;
  const hasTaxEnabled = taxCents !== null && taxCents > 0;

  const allTaxableCents = Math.max(0, allSectionsSubtotalCents - discountVal);
  const allTaxCents = hasTaxEnabled ? Math.round(allTaxableCents * 0.16) : 0;
  const allTotalCents = allTaxableCents + allTaxCents;

  const authorizedTaxableCents = Math.max(0, authorizedSectionsSubtotalCents - discountVal);
  const authorizedTaxCents = hasTaxEnabled ? Math.round(authorizedTaxableCents * 0.16) : 0;
  const authorizedTotalCents = authorizedTaxableCents + authorizedTaxCents;

  const fullSubtotalCents = hasPendingPrice ? null : (hasPartialApproval ? authorizedSectionsSubtotalCents : allSectionsSubtotalCents);
  const fullTaxCents = hasPendingPrice ? null : (hasPartialApproval ? authorizedTaxCents : allTaxCents);
  const fullTotalCents = hasPendingPrice ? null : (hasPartialApproval ? authorizedTotalCents : allTotalCents);

  const displaySubtotalCents = isPrint || hasPartialApproval
    ? fullSubtotalCents
    : (hasPendingPrice ? null : subtotalCents);
  const displayTaxCents = isPrint || hasPartialApproval
    ? fullTaxCents
    : (hasPendingPrice ? null : taxCents);
  const displayTotalCents = isPrint || hasPartialApproval
    ? fullTotalCents
    : (hasPendingPrice ? null : totalCents);

  const partialNotice = hasPartialApproval ? "Total correspondiente únicamente a los conceptos autorizados." : null;
  let globalIndex = 0;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm print:border-none print:shadow-none print:bg-white print:rounded-none">
      <div className="grid gap-6 p-4 md:p-6 print:p-0 print:pt-2">
        {!compactHeader && (
          <div className="flex flex-col rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 print:border-gray-200 print:bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] print:text-gray-500 mb-1">
                  <UserRound data-testid="preview-customer-icon" className="h-3.5 w-3.5 text-[var(--color-primary)] print:text-blue-700" /> Cliente
                </p>
                <p className="text-sm font-semibold text-[var(--color-text-main)] print:text-black">
                  {customerName || "Sin cliente"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] print:text-gray-500 mb-1">
                  <Truck data-testid="preview-vehicle-icon" className="h-3.5 w-3.5 text-[var(--color-primary)] print:text-blue-700" /> Unidad
                </p>
                <p className="text-sm font-semibold text-[var(--color-text-main)] print:text-black">
                  {vehicleDescription || "Sin vehículo"}
                </p>
              </div>
            </div>
          </div>
        )}
        {administrative ? <Badge variant="info">{isNote ? "Nota" : "Cotización"} administrativa</Badge> : null}

        <div className="grid gap-2">
          {title && (
            <h2 className="text-sm font-bold text-[var(--color-text-main)] print:text-black">
              {title}
            </h2>
          )}


          {sections.every((s) => s.items.length === 0) ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border-light)] print:border-gray-200 print:rounded-[var(--radius-sm)]">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)] bg-transparent text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider print:border-gray-200 print:text-gray-500">
                    <th className="px-3 py-2 font-bold whitespace-nowrap w-1 text-center">C.</th>
                    <th className="px-3 py-2 font-bold w-full">Concepto / Servicio Realizado</th>
                    <th className="px-3 py-2 font-bold text-right whitespace-nowrap">P. Unitario</th>
                    <th className="px-3 py-2 font-bold text-right whitespace-nowrap">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary)]/10 print:divide-blue-100">
                  {sections.map((section, sIndex) => {
                    const displayItems = section.items.filter((item) => item.description.trim());
                    if (displayItems.length === 0) return null;
                    const completeItems = displayItems.filter((item) => item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);

                    const isSelectable = Boolean(selectableSectionIds && section.id);
                    const isSelected = isSelectable
                      ? (selectableSectionIds ?? []).includes(section.id ?? "")
                      : hasPartialApproval
                        ? section.isAuthorized === true
                        : true;

                    const sectionSubtotalCents = completeItems.reduce(
                      (acc, item) => acc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100),
                      0
                    );

                    const showsBadge = hasPartialApproval && section.isAuthorized === true;
                    const shouldShowSectionHeader = hasMultipleSections || showsBadge;

                    return (
                      <React.Fragment key={sIndex}>
                        {shouldShowSectionHeader && (
                          <tr className={`bg-[var(--color-bg-soft)]/60 print:bg-gray-50/80 border-b border-[var(--color-border-light)]/50 print:border-gray-100 ${isSelected ? "" : "opacity-40 print:opacity-40"}`}>
                            <td colSpan={4} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-main)] print:text-gray-800">
                              {isSelectable ? (
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(event) => onSectionToggle?.(section.id!, event.target.checked)}
                                    data-testid={`section-toggle-${section.id}`}
                                    className="h-3.5 w-3.5 accent-[var(--color-primary)] print:hidden"
                                  />
                                  <span>{section.name || `Sección ${sIndex + 1}`}</span>
                                  <span className="ml-auto font-normal normal-case tracking-normal text-[var(--color-text-muted)] print:hidden">
                                    {isSelected ? "Incluida" : "Excluida"}
                                  </span>
                                </label>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{section.name || `Sección ${sIndex + 1}`}</span>
                                  {showsBadge ? (
                                    <span className="rounded-full border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[var(--color-status-success-fg)] print:border-green-300 print:bg-green-50 print:text-green-800">
                                      Autorizada
                                    </span>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                         {displayItems.map((item) => {
                          const idx = globalIndex++;
                          const quantityNum = Number(item.quantity);
                           const lineTotalCents = item.unitPrice.trim() ? Math.round(quantityNum * Number(item.unitPrice) * 100) : null;
                          return (
                            <tr key={idx} className={`print:text-black hover:bg-[var(--color-bg-soft)] print:hover:bg-transparent ${isSelected ? "" : "opacity-40 print:opacity-40 text-[var(--color-text-muted)] print:text-gray-400"}`}>
                              <td className="px-3 py-2 align-top text-[var(--color-text-muted)] print:text-gray-700 w-1 whitespace-nowrap text-center font-medium">
                                {item.type === "LABOR" && quantityNum === 1 ? "-" : formatQuantity(item.quantity)}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium text-[var(--color-text-main)] print:text-black">{item.description}</div>
                              </td>
                              <td className="px-3 py-2 align-top text-right text-[var(--color-text-muted)] print:text-gray-700">{item.unitPrice.trim() ? formatCents(Number(item.unitPrice) * 100) : "Pendiente"}</td>
                              <td className="px-3 py-2 align-top text-right font-bold text-[var(--color-text-main)] print:text-black">{formatCents(lineTotalCents)}</td>
                            </tr>
                          );
                        })}
                        {hasMultipleSections && (
                          <tr className={`bg-[var(--color-bg-soft)]/50 print:bg-gray-50/50 ${isSelected ? "" : "opacity-40 print:opacity-40"}`}>
                            <td colSpan={3} className="px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] print:text-gray-600">
                              Subtotal
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-bold text-[var(--color-text-main)] print:text-black">
                              {formatCents(sectionSubtotalCents)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <QuoteTotalsCard
          subtotalCents={displaySubtotalCents}
          discountCents={discountCents}
          taxCents={displayTaxCents}
          totalCents={displayTotalCents}
          printSubtotalCents={fullSubtotalCents}
          printTaxCents={fullTaxCents}
          printTotalCents={fullTotalCents}
          partialNotice={partialNotice}
        />
        <QuotePaymentBalanceIndicator paidCents={paidCents} remainingCents={remainingCents} />

        {description ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 print:border-gray-200 print:bg-gray-50 text-sm text-[var(--color-text-muted)] print:text-gray-600 mt-2 print:break-inside-avoid">
            <p className="font-semibold text-[10px] uppercase tracking-wider mb-1">Notas / Observaciones</p>
            <p className="whitespace-pre-wrap" data-testid="preview-notes-text">{description}</p>
          </div>
        ) : null}

        {!isNote && (
          <div className="mt-2 md:mt-1 print:break-inside-avoid">
            <p data-testid="quote-validity" className="text-[10px] text-[var(--color-text-muted)] print:text-gray-400">
              Vigente hasta el {validUntil ? formatDate(validUntil) : "—"}. Los precios están sujetos a cambios imprevistos
              en el costo de materiales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
