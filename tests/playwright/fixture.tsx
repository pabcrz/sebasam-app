import { createRoot } from "react-dom/client";
import { NotasFilters } from "../../src/features/work-orders/components/notas-filters";
import "../../src/app/globals.css";

const rangeLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).formatRange(new Date(Date.UTC(2026, 8, 28)), new Date(Date.UTC(2026, 9, 3)));

function Fixture() {
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

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The browser fixture root element is missing.");
}

createRoot(rootElement).render(<Fixture />);
