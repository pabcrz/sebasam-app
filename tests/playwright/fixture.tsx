import * as React from "react";
import { createRoot } from "react-dom/client";
import { WorkOrderOperationsDialog } from "../../src/features/work-orders/components/work-order-operations-dialog";
import { NotasFilters } from "../../src/features/work-orders/components/notas-filters";
import "../../src/app/globals.css";

type ConversionOperation = "SALE" | "WORK";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
};

type PersistedSaleQuote = {
  id: string;
  operation: ConversionOperation;
  title: string;
  customerName: string;
};

declare global {
  interface Window {
    __saleQuoteConversionQuote?: PersistedSaleQuote;
    __saleQuoteConversionMock?: {
      calls: ConversionRequest[];
      createNote: (request: ConversionRequest) => Promise<{ success: true }>;
    };
  }
}

const rangeLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).formatRange(new Date(Date.UTC(2026, 8, 28)), new Date(Date.UTC(2026, 9, 3)));

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

function Fixture() {
  if (window.location.pathname === "/sale-quote") {
    return <SaleQuoteFixture />;
  }

  return <NotesFiltersFixture />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The browser fixture root element is missing.");
}

createRoot(rootElement).render(<Fixture />);
