import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { WorkOrderActiveList } from "./work-order-active-list";

vi.mock("@/features/work-orders/components/work-order-operations-dialog", () => ({
  WorkOrderOperationsDialog: () => <button type="button">Gestionar orden</button>,
}));

vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({
  QuoteBuilderDialog: () => <button type="button">Editar cotización</button>,
}));

vi.mock("@/features/quotes/components/share-quote-button", () => ({
  ShareQuoteButton: ({ action }: { action: () => Promise<unknown> }) => <button type="button" onClick={() => void action()}>Compartir cotización</button>,
}));

type ActiveListProps = ComponentProps<typeof WorkOrderActiveList>;

function createQuote() {
  return {
    id: "quote-1",
    number: "COT-001",
    customer: { name: "Cliente de prueba" },
    vehicle: null,
    title: "Servicio de prueba",
    description: "Revisión completa",
    vehicleSnapshot: null,
    administrative: true,
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    paidCents: 0,
    remainingCents: 11600,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    items: [{ sectionId: null, type: "LABOR", description: "Cambio de aceite", quantity: 2, unitPriceCents: 5000 }],
    sections: [],
    activeSharedQuote: {},
  } as unknown as ActiveListProps["quoteMap"] extends Map<string, infer Quote> ? Quote : never;
}

function renderActiveList(
  workOrder: ActiveListProps["workOrders"][number],
  input: { duplicateQuoteAction?: ActiveListProps["duplicateQuoteAction"]; shareAction?: ActiveListProps["shareAction"]; withQuote?: boolean } = {},
) {
  const quoteMap = input.withQuote ? new Map([[workOrder.quote.id, createQuote()]]) : new Map();

  render(
    <WorkOrderActiveList
      workOrders={[workOrder]}
      workers={[]}
      customers={[]}
      quoteMap={quoteMap}
      saveQuoteActions={input.withQuote ? [async () => ({ success: true })] : []}
      searchCustomersAction={async () => []}
      duplicateQuoteAction={input.duplicateQuoteAction ?? vi.fn()}
      shareAction={input.shareAction ?? vi.fn().mockResolvedValue({ success: true, token: "share-token" })}
      workOrderActions={{}}
    />,
  );
}

async function openPreview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Ver detalle de cotización COT-001" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
}

function createWorkOrder(input: { isSpecial: boolean; assignments: Array<{ workerKind: "MASTER" | "HELPER"; displayName: string }> }) {
  return {
    id: "work-order-1",
    number: "OT-001",
    status: "ASSIGNED",
    isSpecial: input.isSpecial,
    quote: {
      id: "quote-1",
      number: "COT-001",
      customer: { name: "Cliente de prueba" },
      vehicle: null,
      totalCents: 12500,
      title: "Servicio de prueba",
    },
    assignments: input.assignments.map((assignment, index) => ({
      id: `assignment-${index}`,
      workerId: `worker-${index}`,
      status: "ACTIVE",
      worker: assignment,
    })),
  } as unknown as ActiveListProps["workOrders"][number];
}

describe("WorkOrderActiveList", () => {
  it("shows special work as plain Taller text without an assignee badge or prefix", () => {
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }));

    expect(screen.getByText("Taller")).not.toHaveClass("inline-flex");
    expect(screen.queryByText("Taller:", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("En proceso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle de cotización COT-001" })).toBeInTheDocument();
  });

  it("shows the assigned master as plain text and retains useful helper context", () => {
    renderActiveList(
      createWorkOrder({
        isSpecial: false,
        assignments: [
          { workerKind: "MASTER", displayName: "Ana López" },
          { workerKind: "HELPER", displayName: "Luis Pérez" },
        ],
      }),
    );

    expect(screen.getByText("Ana López")).not.toHaveClass("inline-flex");
    expect(screen.queryByText("Maestro:", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("+ 1 ayudante(s)")).toBeInTheDocument();
  });

  it("triggers toast error feedback when duplication fails", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    const duplicateQuoteAction = vi.fn().mockRejectedValue(new Error("offline"));
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { duplicateQuoteAction });

    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));

    expect(toastError).toHaveBeenCalledWith(
      "No se pudo duplicar la cotización. Intenta de nuevo.",
      { id: "quote-duplicate-error" }
    );
  });

  it("uses accessible responsive action controls with primary CTA and secondary action row", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }));

    expect(screen.getByTestId("operational-card-primary-action")).toHaveClass("w-full");
    expect(screen.getByRole("button", { name: "Gestionar orden" })).toBeInTheDocument();

    const secondaryActions = screen.getByTestId("operational-card-secondary-actions");
    expect(secondaryActions).toHaveClass("flex", "w-full", "items-center", "gap-2");

    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    const duplicate = screen.getByRole("button", { name: "Duplicar cotización" });
    expect(duplicate).toHaveAttribute("title", "Duplicar cotización");
  });

  it("keeps the preview closed after its close button is clicked", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { withQuote: true });

    await openPreview(user);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the preview closed after Escape", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { withQuote: true });

    await openPreview(user);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the preview closed after backdrop dismissal", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { withQuote: true });

    await openPreview(user);
    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeInstanceOf(HTMLElement);
    if (!(overlay instanceof HTMLElement)) throw new Error("Dialog overlay not found");
    await user.click(overlay);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not reopen the card preview after interacting with preview content", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { withQuote: true });

    await openPreview(user);
    await user.click(screen.getAllByText("Cambio de aceite")[0]);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not open the preview from footer actions", async () => {
    const user = userEvent.setup();
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { withQuote: true });

    await user.click(screen.getByRole("button", { name: "Gestionar orden" }));
    await user.click(screen.getByRole("button", { name: "Editar cotización" }));
    await user.click(screen.getByRole("button", { name: "Compartir cotización" }));
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));

    expect(screen.queryByRole("dialog", { name: "Cotización COT-001" })).not.toBeInTheDocument();
  });

  it("routes the active work-order print affordance back to work orders", () => {
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }));

    const print = screen.getByRole("button", { name: /imprimir orden/i });
    expect(print).toHaveAttribute(
      "data-print-url",
      "/admin/quotes/quote-1/print?returnTo=/admin/work-orders",
    );
    expect(print).toHaveClass("min-h-11", "min-w-11");
    expect(print.querySelector("svg")).toHaveClass("h-5", "w-5");
  });
});
