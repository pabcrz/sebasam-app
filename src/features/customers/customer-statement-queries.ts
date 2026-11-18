import { PaymentStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPaymentSettings, type BankAccountData } from "@/features/payment-settings/domain";
import { getCustomerCreditSummary } from "@/features/payments/domain";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";
import { derivePaymentState, type PaymentState } from "@/features/work-orders/payment-state";
import type { QuotePreviewSummary } from "@/features/quotes/components/quote-preview-dialog";
import type { StatementPeriodParams, StatementPeriodUnit, StatementView } from "./customer-statement";

export type StatementNoteItem = {
  id: string;
  number: string;
  workOrderId: string;
  quoteId: string;
  completedAt: Date | null;
  paymentDueDate: Date | null;
  concepts: string;
  vehicleLabel: string;
  totalCents: number;
  paidCents: number;
  paidCentsAtCutoff: number;
  remainingCents: number;
  paymentState: PaymentState;
  previewQuote: QuotePreviewSummary;
};

export type CustomerStatementSummary = {
  initialBalanceCents: number;
  periodChargesCents: number;
  periodPaymentsCents: number;
  finalBalanceCents: number;
  overdueBalanceCents: number;
};

export type CustomerStatementPaymentActivity =
  | { type: "application"; date: Date; amountCents: number; noteNumber: string }
  | { type: "credit"; date: Date; availableCents: number };

type CustomerStatementPaymentCapture = {
  amountCents: number;
  createdAt: Date;
  applications: Array<{
    amountCents: number;
    createdAt: Date;
    reversedAt: Date | null;
    workOrderId: string | null;
    workOrder: { number: string } | null;
  }>;
};

function buildStatementPaymentActivity(
  payments: CustomerStatementPaymentCapture[],
  notes: StatementNoteItem[],
  cutoff: Date,
): { paymentActivity: CustomerStatementPaymentActivity[]; availableCreditAtCutoffCents: number } {
  const selectedNoteNumbers = new Map(notes.map((note) => [note.workOrderId, note.number]));
  const paymentActivity: CustomerStatementPaymentActivity[] = [];
  let availableCreditAtCutoffCents = 0;

  payments.forEach((payment) => {
    if (payment.createdAt > cutoff) return;

    const activeApplications = payment.applications.filter(
      (application) => application.reversedAt === null && application.createdAt <= cutoff,
    );
    const appliedCents = activeApplications.reduce((total, application) => total + application.amountCents, 0);
    availableCreditAtCutoffCents += Math.max(0, payment.amountCents - appliedCents);

    const appliedAtCaptureCents = activeApplications
      .filter((application) => application.createdAt <= payment.createdAt)
      .reduce((total, application) => total + application.amountCents, 0);
    const generatedCreditCents = Math.max(0, payment.amountCents - appliedAtCaptureCents);

    if (generatedCreditCents > 0) {
      paymentActivity.push({ type: "credit", date: payment.createdAt, availableCents: generatedCreditCents });
    }

    activeApplications.forEach((application) => {
      const noteNumber = selectedNoteNumbers.get(application.workOrderId ?? "");
      if (!noteNumber) return;
      paymentActivity.push({
        type: "application",
        date: application.createdAt,
        amountCents: application.amountCents,
        noteNumber: application.workOrder?.number ?? noteNumber,
      });
    });
  });

  paymentActivity.sort((first, second) => first.date.getTime() - second.date.getTime());
  return { paymentActivity, availableCreditAtCutoffCents };
}

export type CustomerDetailedStatement = {
  customer: {
    id: string;
    name: string;
    commercialName: string | null;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    rfc: string | null;
  };
  emissionDate: Date;
  view: StatementView;
  period: StatementPeriodUnit;
  anchor: string;
  rangeLabel: string;
  availableCreditCents: number;
  availableCreditAtCutoffCents: number;
  summary: CustomerStatementSummary;
  notes: StatementNoteItem[];
  paymentActivity: CustomerStatementPaymentActivity[];
  business: {
    name: string;
    fullName: string;
    address: string;
    contactPhone: string;
    contactWhatsapp: string;
    bankAccounts: BankAccountData[];
  };
};

function formatVehicleLabel(
  vehicle: { brand?: string | null; model?: string | null; year?: number | null; plate?: string | null; economicNumber?: string | null } | null,
  snapshot: unknown,
): string {
  const snap = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)
    : {};

  const eco = vehicle?.economicNumber || (snap.economicNumber ? String(snap.economicNumber) : null);
  const plate = vehicle?.plate || (snap.plate ? String(snap.plate) : null);
  const brand = vehicle?.brand || (snap.brand ? String(snap.brand) : "");
  const model = vehicle?.model || (snap.model ? String(snap.model) : "");

  const parts = [
    eco ? `ECO: ${eco}` : null,
    brand,
    model,
    plate ? `Placas: ${plate}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Sin vehículo";
}

function extractConcepts(
  title: string | null,
  items: Array<{ description: string }>,
  sections: Array<{ items: Array<{ description: string }> }>,
): string {
  if (title && title.trim() !== "") {
    return title.trim();
  }

  const allItems = [
    ...items.map((i) => i.description.trim()),
    ...sections.flatMap((s) => s.items.map((i) => i.description.trim())),
  ].filter(Boolean);

  if (allItems.length === 0) {
    return "Trabajo general";
  }

  return allItems.slice(0, 3).join(" · ");
}

export async function getCustomerDetailedStatement(
  customerId: string,
  periodParams: StatementPeriodParams,
  now = new Date(),
): Promise<CustomerDetailedStatement | null> {
  await requireOperationalRole();

  const [customer, paymentSettings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        fiscalProfiles: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    }),
    getPaymentSettings(),
  ]);

  if (!customer) {
    return null;
  }

  // Fetch all completed work orders for this customer and customer credit summary in parallel
  const [allCompletedOrders, creditSummary, customerPayments] = await Promise.all([
    prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        quote: { customerId },
      },
    include: {
      quote: {
        include: {
          customer: true,
          vehicle: true,
          items: { orderBy: { sortOrder: "asc" } },
          sections: {
            include: { items: { orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
          },
          settlementAgreement: true,
        },
      },
      paymentApplications: {
        where: {
          reversedAt: null,
          payment: {
            status: PaymentStatus.PAID,
            reversedAt: null,
          },
        },
        include: {
          payment: true,
        },
      },
    },
    orderBy: [{ completedAt: "asc" }, { id: "asc" }],
    }),
    getCustomerCreditSummary(prisma, customerId),
    prisma.payment.findMany({
      where: {
        customerId,
        status: PaymentStatus.PAID,
        reversedAt: null,
        createdAt: { lte: now },
        correctionsOriginal: { none: {} },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        amountCents: true,
        createdAt: true,
        applications: {
          where: { reversedAt: null, createdAt: { lte: now } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            amountCents: true,
            createdAt: true,
            reversedAt: true,
            workOrderId: true,
            workOrder: { select: { number: true } },
          },
        },
      },
    }),
  ]);

  const { view, period, anchor, rangeLabel, start, end } = periodParams;

  // Compute opening balance (cargos anteriores - abonos anteriores) if temporal boundary start exists
  let initialBalanceCents = 0;
  if (view === "history" && start !== null) {
    let previousCharges = 0;
    let previousPayments = 0;

    allCompletedOrders.forEach((wo) => {
      if (wo.completedAt && wo.completedAt < start) {
        previousCharges += getEffectiveSettlementTotals(wo.quote, wo.quote.settlementAgreement).totalCents;
      }
      wo.paymentApplications.forEach((pa) => {
        if (pa.createdAt < start) {
          previousPayments += pa.amountCents;
        }
      });
    });

    initialBalanceCents = Math.max(0, previousCharges - previousPayments);
  }

  let periodChargesCents = 0;
  let periodPaymentsCents = 0;

  if (view === "history") {
    allCompletedOrders.forEach((wo) => {
      const inPeriod = start === null || end === null || (wo.completedAt && wo.completedAt >= start && wo.completedAt < end);
      if (inPeriod) {
        periodChargesCents += getEffectiveSettlementTotals(wo.quote, wo.quote.settlementAgreement).totalCents;
      }
      wo.paymentApplications.forEach((pa) => {
        const paInPeriod = start === null || end === null || (pa.createdAt >= start && pa.createdAt < end);
        if (paInPeriod) {
          periodPaymentsCents += pa.amountCents;
        }
      });
    });
  }

  // Determine which notes to display
  const statementNotes: StatementNoteItem[] = [];

  allCompletedOrders.forEach((wo) => {
    const totalCents = getEffectiveSettlementTotals(wo.quote, wo.quote.settlementAgreement).totalCents;
    const paidCents = wo.paymentApplications.reduce((sum, pa) => sum + pa.amountCents, 0);
    const paidCentsAtCutoff = wo.paymentApplications
      .filter((pa) => pa.createdAt <= now)
      .reduce((sum, pa) => sum + pa.amountCents, 0);
    const remainingCents = Math.max(0, totalCents - paidCents);
    const dueDate = wo.paymentDueDate ?? wo.quote.paymentDueDate ?? null;

    const paymentState = derivePaymentState(
      {
        completedAt: wo.completedAt,
        paymentDueDate: dueDate,
        paidCents,
        remainingCents,
      },
      now,
    );

    // Build QuotePreviewSummary for interactive preview
    const previewQuote: QuotePreviewSummary = {
      id: wo.quote.id,
      number: wo.quote.number,
      title: wo.quote.title,
      description: wo.quote.description,
      administrative: wo.quote.administrative,
      vehicleSnapshot: wo.quote.vehicleSnapshot,
      customerSnapshot: wo.quote.customerSnapshot,
      contactSnapshot: wo.quote.contactSnapshot,
      subtotalCents: wo.quote.subtotalCents ? Number(wo.quote.subtotalCents) : null,
      discountCents: Number(wo.quote.discountCents ?? 0),
      taxCents: wo.quote.taxCents ? Number(wo.quote.taxCents) : null,
      totalCents,
      paidCents,
      remainingCents,
      validUntil: wo.quote.validUntil,
      customer: { name: customer.commercialName || customer.name },
      vehicle: wo.quote.vehicle
        ? {
            plate: wo.quote.vehicle.plate,
            brand: wo.quote.vehicle.brand,
            model: wo.quote.vehicle.model,
            year: wo.quote.vehicle.year,
          }
        : null,
      workOrder: { id: wo.id, status: wo.status },
      items: wo.quote.items.map((it) => ({
        sectionId: it.sectionId,
        type: it.type,
        description: it.description,
        quantity: String(Number(it.quantity)),
        unitPriceCents: it.unitPriceCents ? Number(it.unitPriceCents) : null,
      })),
      sections: wo.quote.sections.map((sec) => ({
        name: sec.name,
        items: sec.items.map((it) => ({
          type: it.type,
          description: it.description,
          quantity: String(Number(it.quantity)),
          unitPriceCents: it.unitPriceCents ? Number(it.unitPriceCents) : null,
        })),
      })),
    };

    const concepts = extractConcepts(wo.quote.title, wo.quote.items, wo.quote.sections);
    const vehicleLabel = formatVehicleLabel(wo.quote.vehicle, wo.quote.vehicleSnapshot);

    const noteItem: StatementNoteItem = {
      id: wo.id,
      number: wo.number,
      workOrderId: wo.id,
      quoteId: wo.quote.id,
      completedAt: wo.completedAt,
      paymentDueDate: dueDate,
      concepts,
      vehicleLabel,
      totalCents,
      paidCents,
      paidCentsAtCutoff,
      remainingCents,
      paymentState,
      previewQuote,
    };

    if (view === "pending") {
      if (remainingCents > 0) {
        statementNotes.push(noteItem);
      }
    } else {
      // history view
      if (start === null || end === null) {
        // all
        statementNotes.push(noteItem);
      } else {
        const completedInPeriod = wo.completedAt && wo.completedAt >= start && wo.completedAt < end;
        const paidInPeriod = wo.paymentApplications.some((pa) => pa.createdAt >= start && pa.createdAt < end);
        if (completedInPeriod || paidInPeriod) {
          statementNotes.push(noteItem);
        }
      }
    }
  });

  const { paymentActivity, availableCreditAtCutoffCents } = buildStatementPaymentActivity(
    customerPayments,
    statementNotes,
    now,
  );

  // Calculate final totals based on view
  let finalBalanceCents = 0;
  let overdueBalanceCents = 0;

  if (view === "pending") {
    const totalPending = statementNotes.reduce((sum, n) => sum + n.remainingCents, 0);
    const totalOverdue = statementNotes
      .filter((n) => n.paymentState.label === "Vencida")
      .reduce((sum, n) => sum + n.remainingCents, 0);
    const totalCharges = statementNotes.reduce((sum, n) => sum + n.totalCents, 0);
    const totalPaid = statementNotes.reduce((sum, n) => sum + n.paidCents, 0);

    initialBalanceCents = 0;
    periodChargesCents = totalCharges;
    periodPaymentsCents = totalPaid;
    finalBalanceCents = totalPending;
    overdueBalanceCents = totalOverdue;
  } else {
    finalBalanceCents = Math.max(0, initialBalanceCents + periodChargesCents - periodPaymentsCents);
    overdueBalanceCents = statementNotes
      .filter((n) => n.paymentState.label === "Vencida")
      .reduce((sum, n) => sum + n.remainingCents, 0);
  }

  const defaultFiscal = customer.fiscalProfiles[0];
  const rfc = defaultFiscal?.taxId ?? null;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      commercialName: customer.commercialName,
      legalName: customer.legalName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      rfc,
    },
    emissionDate: now,
    view,
    period,
    anchor,
    rangeLabel,
    availableCreditCents: creditSummary.availableCreditCents,
    availableCreditAtCutoffCents,
    summary: {
      initialBalanceCents,
      periodChargesCents,
      periodPaymentsCents,
      finalBalanceCents,
      overdueBalanceCents,
    },
    notes: statementNotes,
    paymentActivity,
    business: {
      name: paymentSettings.name,
      fullName: paymentSettings.fullName,
      address: paymentSettings.address,
      contactPhone: paymentSettings.contactPhone,
      contactWhatsapp: paymentSettings.contactWhatsapp,
      bankAccounts: paymentSettings.bankAccounts,
    },
  };
}
