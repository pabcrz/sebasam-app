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
  /** Renders accessible item cards below the table breakpoint. */
  compactItems?: boolean;
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
  compactItems,
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
  const visibleSections = sections.flatMap((section, sectionIndex) => {
    const displayItems = section.items.filter((item) => item.description.trim());
    if (displayItems.length === 0) return [];

    const completeItems = displayItems.filter((item) => item.unitPrice.trim() !== "" && Number(item.unitPrice) >= 0);
    const isSelectable = Boolean(selectableSectionIds && section.id);
    const isSelected = isSelectable
      ? (selectableSectionIds ?? []).includes(section.id ?? "")
      : hasPartialApproval
        ? section.isAuthorized === true
        : true;
    const sectionSubtotalCents = completeItems.reduce(
      (acc, item) => acc + Math.round(Number(item.quantity) * Number(item.unitPrice) * 100),
      0,
    );
    const showsBadge = hasPartialApproval && section.isAuthorized === true;

    return [{
      section,
      sectionIndex,
      displayItems,
      isSelectable,
      isSelected,
      sectionSubtotalCents,
      showsBadge,
      shouldShowSectionHeader: hasMultipleSections || showsBadge,
    }];
  });

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm print:border-none print:shadow-none print:bg-white print:rounded-none flex-1 flex flex-col print:min-h-0 print:flex-none">
      <div className="flex-1 flex flex-col gap-6 p-4 md:p-6 print:gap-3 print:p-0 print:pt-2 print:min-h-0 print:flex-none">
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

        <div className="grid gap-2 print:gap-1.5">
          {title && (
            <h2 className="text-sm font-bold text-[var(--color-text-main)] print:text-black">
              {title}
            </h2>
          )}


          {visibleSections.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <>
              {compactItems ? (
                <div data-testid="quote-compact-items" className="grid gap-3 md:hidden print:hidden">
                  {visibleSections.map(({ section, sectionIndex, displayItems, isSelectable, isSelected, showsBadge, shouldShowSectionHeader }) => (
                    <section key={section.id ?? sectionIndex} className={`rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] ${isSelected ? "" : "opacity-40"}`}>
                      {shouldShowSectionHeader ? (
                        <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] bg-[var(--color-bg-soft)] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-main)]">
                          {isSelectable ? (
                            <label className="flex flex-1 items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(event) => onSectionToggle?.(section.id!, event.target.checked)}
                                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                              />
                              <span>{section.name || `Sección ${sectionIndex + 1}`}</span>
                            </label>
                          ) : (
                            <h3>{section.name || `Sección ${sectionIndex + 1}`}</h3>
                          )}
                          {showsBadge ? (
                            <span className="rounded-full border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[var(--color-status-success-fg)]">
                              Autorizada
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <ul aria-label={`${section.name || `Sección ${sectionIndex + 1}`} conceptos`} className="divide-y divide-[var(--color-border-light)]/70">
                        {displayItems.map((item, itemIndex) => {
                          const quantityNum = Number(item.quantity);
                          const unitPriceCents = item.unitPrice.trim() ? Number(item.unitPrice) * 100 : null;
                          const lineTotalCents = unitPriceCents != null ? Math.round(quantityNum * unitPriceCents) : null;
                          const showUnitDetail = quantityNum > 1 && unitPriceCents != null;

                          return (
                            <li key={itemIndex} className="flex items-start justify-between gap-3 px-3.5 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="break-words font-medium text-sm text-[var(--color-text-main)] leading-snug">
                                  {item.description}
                                </p>
                                {showUnitDetail ? (
                                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)] font-medium">
                                    {formatQuantity(item.quantity)} × {formatCents(unitPriceCents)} c/u
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right whitespace-nowrap pt-0.5">
                                <span className="text-sm font-bold text-[var(--color-text-main)] tabular-nums">
                                  {formatCents(lineTotalCents)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : null}
              <div data-testid="quote-items-table" className={`${compactItems ? "sr-only md:not-sr-only print:not-sr-only" : ""} overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-border-light)] print:border-gray-200 print:rounded-[var(--radius-sm)]`}>
                <table className="w-full border-collapse text-left text-sm">
                <thead className="print:table-header-group">
                  <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-bg-soft)]/40 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider print:border-gray-200 print:bg-transparent print:text-gray-500">
                    <th className="w-16 px-3 py-2 print:py-1.5 font-bold whitespace-nowrap text-center">Cant.</th>
                    <th className="px-3 py-2 print:py-1.5 font-bold w-full">Concepto / Servicio Realizado</th>
                    <th className="w-28 px-3 py-2 print:py-1.5 font-bold text-right whitespace-nowrap tabular-nums">P. Unitario</th>
                    <th className="w-28 px-3 py-2 print:py-1.5 font-bold text-right whitespace-nowrap tabular-nums">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-primary)]/10 print:table-row-group print:divide-blue-100">
                  {visibleSections.map(({ section, sectionIndex, displayItems, isSelectable, isSelected, sectionSubtotalCents, showsBadge, shouldShowSectionHeader }) => {
                    return (
                      <React.Fragment key={section.id ?? sectionIndex}>
                        {shouldShowSectionHeader && (
                          <tr className={`break-after-avoid bg-[var(--color-bg-soft)]/60 border-b border-[var(--color-border-light)]/50 print:break-after-avoid print:border-gray-100 print:bg-gray-50/80 ${isSelected ? "" : "opacity-40 print:opacity-40"}`}>
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
                                  <span>{section.name || `Sección ${sectionIndex + 1}`}</span>
                                  <span className="ml-auto font-normal normal-case tracking-normal text-[var(--color-text-muted)] print:hidden">
                                    {isSelected ? "Incluida" : "Excluida"}
                                  </span>
                                </label>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{section.name || `Sección ${sectionIndex + 1}`}</span>
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
                         {displayItems.map((item, itemIndex) => {
                          const quantityNum = Number(item.quantity);
                          const lineTotalCents = item.unitPrice.trim() ? Math.round(quantityNum * Number(item.unitPrice) * 100) : null;
                          const isServiceOrLaborSingle = item.type === "LABOR" && quantityNum === 1;
                          const quantityDisplay = isServiceOrLaborSingle || quantityNum === 0 ? "" : formatQuantity(item.quantity);

                          return (
                            <tr key={itemIndex} className={`break-inside-avoid ${itemIndex === 0 ? "print:break-before-avoid " : ""}print:break-inside-avoid print:text-black hover:bg-[var(--color-bg-soft)] print:hover:bg-transparent ${isSelected ? "" : "opacity-40 print:opacity-40 text-[var(--color-text-muted)] print:text-gray-400"}`}>
                              <td className="w-16 px-3 py-2 print:py-1.5 align-top text-[var(--color-text-muted)] print:text-gray-700 whitespace-nowrap text-center font-medium tabular-nums">
                                {quantityDisplay}
                              </td>
                              <td className="px-3 py-2 print:py-1.5 align-top">
                                <div className="font-medium text-[var(--color-text-main)] print:text-black">{item.description}</div>
                              </td>
                              <td className="w-28 px-3 py-2 print:py-1.5 align-top text-right text-[var(--color-text-muted)] print:text-gray-700 whitespace-nowrap tabular-nums">{item.unitPrice.trim() ? formatCents(Number(item.unitPrice) * 100) : "Pendiente"}</td>
                              <td className="w-28 px-3 py-2 print:py-1.5 align-top text-right font-bold text-[var(--color-text-main)] print:text-black whitespace-nowrap tabular-nums">{formatCents(lineTotalCents)}</td>
                            </tr>
                          );
                        })}
                        {hasMultipleSections && (
                          <tr className={`break-inside-avoid bg-[var(--color-bg-soft)]/50 print:break-inside-avoid print:bg-gray-50/50 ${isSelected ? "" : "opacity-40 print:opacity-40"}`}>
                            <td colSpan={3} className="px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] print:text-gray-600">
                              Subtotal
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-bold text-[var(--color-text-main)] print:text-black tabular-nums">
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
            </>
          )}
        </div>

        <div className="mt-auto print:mt-4 flex flex-col gap-4 print:gap-2 print:break-inside-avoid">
          <div data-testid="quote-totals-block" className="print:break-inside-avoid">
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
          </div>
          <QuotePaymentBalanceIndicator paidCents={paidCents} remainingCents={remainingCents} />

          {description ? (
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 print:border-gray-200 print:bg-gray-50 text-sm text-[var(--color-text-muted)] print:text-gray-600 print:break-inside-avoid">
              <p className="font-semibold text-[10px] uppercase tracking-wider mb-1">Notas / Observaciones</p>
              <p className="whitespace-pre-wrap" data-testid="preview-notes-text">{description}</p>
            </div>
          ) : null}

          {!isNote && (
            <div className="print:break-inside-avoid">
              <p data-testid="quote-validity" className="text-[10px] text-[var(--color-text-muted)] print:text-gray-400">
                Vigente hasta el {validUntil ? formatDate(validUntil) : "—"}. Los precios están sujetos a cambios imprevistos
                en el costo de materiales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
