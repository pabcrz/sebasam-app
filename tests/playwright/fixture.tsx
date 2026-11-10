import * as React from "react";
import { createRoot } from "react-dom/client";
import { WorkOrderOperationsDialog } from "../../src/features/work-orders/components/work-order-operations-dialog";
import { QuoteFilters } from "../../src/features/quotes/components/quote-filters";
import { parseOperationalQuoteParams } from "../../src/features/quotes/quote-filter-model";
import { NotasFilters } from "../../src/features/work-orders/components/notas-filters";
import { QuoteListRow } from "../../src/features/quotes/components/quote-list-row";
import { QuoteListCard } from "../../src/features/quotes/components/quote-mobile-card";
import "../../src/app/globals.css";

type ConversionOperation = "SALE" | "WORK";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
};

type WorkAssignmentRequest = {
  isSpecial: boolean;
  masterId?: string;
  helperIds?: string[];
};

type WorkCompletionRequest = {
  workOrderId: string;
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
      assignCalls: WorkAssignmentRequest[];
      completeCalls: WorkCompletionRequest[];
      convert: (request: ConversionRequest) => Promise<{ success: true }>;
      assign: (request: WorkAssignmentRequest) => Promise<{ success: true }>;
      complete: (request: WorkCompletionRequest) => Promise<{ success: true }>;
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
  workQuoteId: "quote-flow-work",
  workOrderId: "work-order-assigned",
  saleQuoteNumber: "C-SALE-001",
  workQuoteNumber: "C-WORK-001",
  masterId: "worker-master-1",
  masterName: "Maestro principal",
  helperId: "worker-helper-1",
  helperName: "Ayudante principal",
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

type QuoteFlowWorker = NonNullable<QuoteFlowProps["workers"]>[number];

const workers: QuoteFlowWorker[] = [
  {
    id: quoteFlowFixture.masterId,
    displayName: quoteFlowFixture.masterName,
    role: "WORKER",
    workerKind: "MASTER",
  },
  {
    id: quoteFlowFixture.helperId,
    displayName: quoteFlowFixture.helperName,
    role: "WORKER",
    workerKind: "HELPER",
  },
];

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

function createQuote(operation: ConversionOperation, stage?: "unassigned" | "assigned"): QuoteFlowQuote {
  const isSale = operation === "SALE";
  const quoteNumber = isSale ? quoteFlowFixture.saleQuoteNumber : quoteFlowFixture.workQuoteNumber;
  const workOrder = !isSale && stage === "assigned"
    ? {
        id: quoteFlowFixture.workOrderId,
        number: "OT-WORK-001",
        status: "ASSIGNED",
        isSpecial: false,
        assignments: [
          {
            id: "assignment-master-1",
            workerId: quoteFlowFixture.masterId,
            status: "ACTIVE",
            worker: { displayName: quoteFlowFixture.masterName, workerKind: "MASTER" },
          },
        ],
      }
    : null;

  const quote = {
    id: isSale ? quoteFlowFixture.saleQuoteId : quoteFlowFixture.workQuoteId,
    number: quoteNumber,
    folio: quoteNumber,
    title: isSale ? "Venta mostrador fixture" : "Servicio mecánico fixture",
    description: "Fixture browser contract quote",
    administrative: false,
    status: "APPROVED",
    operation,
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
    workOrder,
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
  // Payment actions are unreachable in this quote-flow fixture; keep a typed,
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
  const operation = params.get("operation") === "WORK" ? "WORK" : "SALE";
  const stage = params.get("stage") === "assigned" ? "assigned" : "unassigned";
  const contract = window.__quoteFlowContract;

  if (!contract) {
    throw new Error("The quote-flow fixture requires window.__quoteFlowContract.");
  }

  const quote = createQuote(operation, stage);
  const workOrderActions = {
    convert: async (input: unknown) => contract.convert(input as ConversionRequest),
    assign: async (input: unknown) => contract.assign(input as WorkAssignmentRequest),
    complete: async (input: unknown) => contract.complete(input as WorkCompletionRequest),
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
    workers,
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

/** Actual component with isolated URL navigation; no server queries or mutation actions. */
function QuoteFiltersFixture() {
  const [search, setSearch] = React.useState(window.location.search);
  React.useEffect(() => {
    const original = window.history.pushState;
    const update = () => setSearch(window.location.search);
    window.history.pushState = function (...args) {
      original.apply(this, args);
      update();
    };
    window.addEventListener("popstate", update);
    return () => {
      window.history.pushState = original;
      window.removeEventListener("popstate", update);
    };
  }, []);
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:p-6">
      <h1 className="text-xl font-bold">Cotizaciones</h1>
      <QuoteFilters
        filters={parseOperationalQuoteParams(Object.fromEntries(new URLSearchParams(search)))}
        customers={[{ id: "fixture-customer", name: "Taller de prueba" }]}
      />
    </main>
  );
}

function Fixture() {
  if (window.location.pathname === "/quote-filters" || window.location.pathname === "/admin/quotes") return <QuoteFiltersFixture />;
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
