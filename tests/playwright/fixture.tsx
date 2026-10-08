import * as React from "react";
import { createRoot } from "react-dom/client";
import { WorkOrderOperationsDialog } from "../../src/features/work-orders/components/work-order-operations-dialog";
import { NotasFilters } from "../../src/features/work-orders/components/notas-filters";
import { QuoteListRow } from "../../src/features/quotes/components/quote-list-row";
import { QuoteListCard } from "../../src/features/quotes/components/quote-mobile-card";
import "../../src/app/globals.css";

type ConversionOperation = "SALE";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
};

type SaleQuoteFixtureData = {
  id: string;
  operation: ConversionOperation;
  title: string;
  customerName: string;
};

declare global {
  interface Window {
    __saleQuoteConversionQuote?: SaleQuoteFixtureData;
    __saleQuoteConversionMock?: {
      calls: ConversionRequest[];
      createNote: (request: ConversionRequest) => Promise<{ success: true }>;
    };
    __quoteFlowContract?: {
      convertCalls: ConversionRequest[];
      convert: (request: ConversionRequest) => Promise<{ success: true }>;
    };
  }
}

const rangeLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).formatRange(new Date(Date.UTC(2026, 8, 28)), new Date(Date.UTC(2026, 9, 3)));

const quoteFlowFixture = {
  saleQuoteId: "quote-flow-sale",
  saleQuoteNumber: "C-SALE-001",
} as const;

const quoteStatusLabels = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
} as const;

const quoteStatusBadgeVariant = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "warning",
  ARCHIVED: "default",
} as const;

type QuoteFlowProps = React.ComponentProps<typeof QuoteListRow> & React.ComponentProps<typeof QuoteListCard>;

type QuoteFlowQuote = QuoteFlowProps["quote"];

const baseItem = {
  id: "quote-flow-item-1",
  sectionId: null,
  type: "REFACCIONES",
  description: "Refacción fixture",
  quantity: 1,
  unitPriceCents: 10000,
  discountCents: 0,
  taxCents: 0,
  totalCents: 10000,
} as const;

function createSaleQuote(): QuoteFlowQuote {
  const quote = {
    id: quoteFlowFixture.saleQuoteId,
    number: quoteFlowFixture.saleQuoteNumber,
    folio: quoteFlowFixture.saleQuoteNumber,
    title: "Venta mostrador fixture",
    description: "Fixture browser contract quote",
    administrative: false,
    status: "APPROVED",
    operation: "SALE",
    customerId: "customer-quote-flow",
    customer: {
      id: "customer-quote-flow",
      name: "Cliente Quote Flow",
      commercialName: null,
      legalName: null,
    },
    customerSnapshot: { name: "Cliente Quote Flow" },
    contactSnapshot: null,
    customerContact: null,
    customerFiscalProfile: null,
    vehicleId: "vehicle-quote-flow",
    vehicle: {
      id: "vehicle-quote-flow",
      plate: "QF-001",
      economicNumber: "ECO-QF",
      brand: "Nissan",
      model: "NP300",
      year: 2026,
    },
    vehicleSnapshot: {
      plate: "QF-001",
      economicNumber: "ECO-QF",
      brand: "Nissan",
      model: "NP300",
    },
    sections: [],
    items: [baseItem],
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 0,
    totalCents: 10000,
    paidCents: 0,
    remainingCents: 10000,
    taxEnabled: false,
    validUntil: new Date(Date.UTC(2026, 9, 31)),
    operationalDate: new Date(Date.UTC(2026, 8, 28)),
    paymentDueDate: null,
    submissionKey: null,
    isLocked: false,
    workOrder: null,
    payableNote: null,
  };

  // The browser fixture only renders fields exercised by QuoteListRow/QuoteListCard;
  // the full Prisma-backed QuoteListSummary includes unrelated relation metadata.
  return quote as unknown as QuoteFlowQuote;
}

const noopFormAction = async () => undefined;
const noopQuoteStateAction: QuoteFlowProps["saveAction"] = async (state) => state;
const noopBooleanAction = async () => ({ success: true });
const noopPaymentRequestAction: QuoteFlowProps["paymentRequestAction"] = async () => {
  // Payment actions are unreachable in this SALE fixture; keep a typed,
  // database-free sentinel for the required component prop.
  return { id: "unused-payment-request" } as unknown as Awaited<ReturnType<QuoteFlowProps["paymentRequestAction"]>>;
};

function NotesFiltersFixture() {
  return (
    <main className="mx-auto w-full max-w-screen-xl p-4 md:p-6">
      <NotasFilters
        mode="week"
        payment="pending"
        assignee="workshop"
        overdue="overdue"
        kind="all"
        anchor="2026-09-28"
        rangeLabel={rangeLabel}
        isCurrentWeek
        masters={[]}
      />
    </main>
  );
}

function SaleQuoteFixture() {
  const containerRef = React.useRef<HTMLElement>(null);
  const quote = window.__saleQuoteConversionQuote;
  const mock = window.__saleQuoteConversionMock;

  React.useEffect(() => {
    const trigger = containerRef.current?.querySelector<HTMLButtonElement>("button");
    trigger?.click();
  }, []);

  if (!quote || !mock) {
    throw new Error("The sale quote conversion fixture requires the Playwright sale quote globals.");
  }

  return (
    <main ref={containerRef} className="mx-auto w-full max-w-screen-xl p-4 md:p-6">
      <WorkOrderOperationsDialog
        quoteId={quote.id}
        quoteOperation={quote.operation}
        quoteNumber="C-SALE-001"
        quoteStatus="APPROVED"
        workOrder={null}
        actions={{
          convert: async (input) => {
            await mock.createNote(input as ConversionRequest);
            return { success: true };
          },
        }}
      />
    </main>
  );
}

function QuoteFlowFixture() {
  const params = new URLSearchParams(window.location.search);
  const device = params.get("device") === "mobile" ? "mobile" : "desktop";
  const contract = window.__quoteFlowContract;

  if (!contract) {
    throw new Error("The quote-flow fixture requires window.__quoteFlowContract.");
  }

  const quote = createSaleQuote();
  const workOrderActions = {
    convert: async (input: unknown) => contract.convert(input as ConversionRequest),
  };
  const commonProps = {
    quote,
    quoteStatusLabels,
    quoteStatusBadgeVariant,
    approveAction: noopFormAction,
    cancelAction: noopFormAction,
    shareAction: noopBooleanAction,
    authorizeAction: noopBooleanAction,
    correctDecisionAction: noopBooleanAction,
    paymentRequestAction: noopPaymentRequestAction,
    paymentRequestBankAccounts: [],
    duplicateAction: noopFormAction,
    deleteAction: noopFormAction,
    archiveAction: async () => undefined,
    restoreAction: async () => undefined,
    customers: [],
    saveAction: noopQuoteStateAction,
    searchCustomersAction: async () => [],
    workers: [],
    workOrderActions,
  } as unknown as QuoteFlowProps;

  if (device === "mobile") {
    return (
      <main className="mx-auto w-full max-w-md p-4">
        <QuoteListCard {...commonProps} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl p-4 md:p-6">
      <table className="w-full">
        <tbody>
          <QuoteListRow {...commonProps} />
        </tbody>
      </table>
    </main>
  );
}

function Fixture() {
  if (window.location.pathname === "/sale-quote") {
    return <SaleQuoteFixture />;
  }

  if (window.location.pathname === "/quote-flow") {
    return <QuoteFlowFixture />;
  }

  return <NotesFiltersFixture />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The browser fixture root element is missing.");
}

createRoot(rootElement).render(<Fixture />);
