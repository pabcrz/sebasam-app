import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseWorkOrderParams } from "../work-order-filter-model";
import { WorkOrderFilters } from "./work-order-filters";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const workerId = "11111111-1111-4111-8111-111111111111";
const customers = [{ id: "customer-1", name: "Taller de prueba" }];
const workers = [{ id: workerId, displayName: "Maestro de prueba" }];
const criteria = {
  number: "OT-42", concept: "aceite", customerId: "customer-1", plate: "ABC-123", economicNumber: "ECO-42",
  dateFrom: "2026-08-01", dateTo: "2026-08-31", execution: "PLANNED", assignee: workerId,
  scheduledFrom: "2026-09-01", scheduledTo: "2026-09-30", page: "3",
};
const canonical = `/admin/work-orders?number=OT-42&concept=aceite&customerId=customer-1&plate=ABC-123&economicNumber=ECO-42&dateFrom=2026-08-01&dateTo=2026-08-31&execution=PLANNED&assignee=${workerId}&scheduledFrom=2026-09-01&scheduledTo=2026-09-30`;

function view(input: Record<string, unknown> = {}) {
  return <WorkOrderFilters filters={parseWorkOrderParams(input)} customers={customers} workers={workers} />;
}
async function openSheet() {
  await userEvent.click(screen.getByRole("button", { name: /^Filtros/ }));
  return screen.getByRole("dialog", { name: "Filtros" });
}

describe("WorkOrderFilters", () => {
  beforeEach(() => push.mockClear());

  it("counts the applied criteria as Filtros (N) on an outline button, like the quote filters", () => {
    render(view(criteria));

    const button = screen.getByRole("button", { name: "Filtros (11)" });
    expect(button).toHaveClass("border", "bg-[var(--color-surface)]");
  });

  it("keeps the folio in the search field and every other criterion as a removable chip", () => {
    render(view(criteria));

    expect(screen.getByRole("searchbox", { name: "Buscar por folio" })).toHaveValue("OT-42");
    for (const summary of ["Folio: OT-42", "Concepto: aceite", "Cliente: Taller de prueba", "Placas: ABC-123", "ECO: ECO-42", "Ejecución: Pendiente de asignación", "Responsable: Maestro de prueba", "Fecha operativa desde: 2026-08-01", "Fecha operativa hasta: 2026-08-31", "Programación desde: 2026-09-01", "Programación hasta: 2026-09-30"]) {
      expect(screen.getByRole("button", { name: `Quitar filtro: ${summary}` })).toBeInTheDocument();
    }
  });

  it("submits the search field as the only folio criterion, keeping the rest and resetting pagination", async () => {
    render(view(criteria));

    const search = screen.getByRole("searchbox", { name: "Buscar por folio" });
    await userEvent.click(search);
    fireEvent.change(search, { target: { value: "OT-77" } });
    await userEvent.keyboard("{Enter}");

    expect(push).toHaveBeenCalledExactlyOnceWith(canonical.replace("number=OT-42", "number=OT-77"));
  });

  it("applies every sheet criterion at once and resets the page", async () => {
    render(view(criteria));
    const sheet = await openSheet();

    expect(within(sheet).getByLabelText("Concepto")).toHaveValue("aceite");
    expect(within(sheet).getByLabelText("Placas")).toHaveValue("ABC-123");
    expect(within(sheet).getByLabelText("ECO")).toHaveValue("ECO-42");
    expect(within(sheet).getByLabelText("Fecha operativa desde")).toHaveValue("2026-08-01");
    expect(within(sheet).getByLabelText("Programación hasta")).toHaveValue("2026-09-30");
    expect(within(sheet).queryByLabelText("Folio")).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Tipo de operación")).not.toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Mostrar archivadas")).not.toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole("button", { name: "Ver resultados" }));
    expect(push).toHaveBeenCalledExactlyOnceWith(canonical);
  });

  it.each([
    ["PLANNED", "Pendiente de asignación", "workshop", "Taller especial"],
    ["ASSIGNED", "Asignado", workerId, "Maestro de prueba"],
    ["IN_PROGRESS", "En ejecución", "all", "Todos"],
  ])("derives %s and responsible selections from the URL model", async (execution, label, assignee, responsible) => {
    render(view({ execution, assignee }));
    expect(screen.getByRole("button", { name: `Quitar filtro: Ejecución: ${label}` })).toBeInTheDocument();
    if (assignee !== "all") expect(screen.getByRole("button", { name: `Quitar filtro: Responsable: ${responsible}` })).toBeInTheDocument();
    const sheet = await openSheet();

    expect(within(sheet).getByRole("combobox", { name: "Ejecución" })).toHaveTextContent(label);
    expect(within(sheet).getByRole("combobox", { name: "Responsable" })).toHaveTextContent(responsible);
  });

  it.each([
    ["Fecha operativa desde", "Fecha operativa hasta", "La fecha operativa desde no puede ser posterior a hasta"],
    ["Programación desde", "Programación hasta", "La programación desde no puede ser posterior a hasta"],
  ])("rejects inverted %s without navigation, keeps the sheet open and retains correction fields", async (from, to, message) => {
    render(view());
    const sheet = await openSheet();
    await userEvent.type(within(sheet).getByLabelText(from), "2026-09-30");
    await userEvent.type(within(sheet).getByLabelText(to), "2026-09-01");
    await userEvent.click(within(sheet).getByRole("button", { name: "Ver resultados" }));

    expect(within(sheet).getByRole("alert")).toHaveTextContent(message);
    expect(within(sheet).getByLabelText(from)).toHaveValue("2026-09-30");
    expect(within(sheet).getByLabelText(to)).toHaveValue("2026-09-01");
    expect(push).not.toHaveBeenCalled();
  });

  it("removes one criterion from its chip and keeps the others", async () => {
    render(view(criteria));

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro: Concepto: aceite" }));

    expect(push).toHaveBeenCalledExactlyOnceWith(canonical.replace("&concept=aceite", ""));
  });

  it("opens rejected incoming dates and submits only after correction", async () => {
    const dates = { dateFrom: "2026-09-01", dateTo: criteria.dateTo, scheduledFrom: criteria.scheduledFrom, scheduledTo: criteria.scheduledTo };
    render(<WorkOrderFilters filters={parseWorkOrderParams({ ...criteria, dateFrom: undefined, dateTo: undefined, scheduledFrom: undefined, scheduledTo: undefined })}
      customers={customers} workers={workers} rejectedRange={{ kind: "operational", dates }} />);

    const sheet = screen.getByRole("dialog", { name: "Filtros" });
    expect(within(sheet).getByRole("alert")).toHaveTextContent("La fecha operativa desde no puede ser posterior a hasta");
    expect(within(sheet).getByLabelText("Fecha operativa desde")).toHaveValue("2026-09-01");
    expect(within(sheet).getByLabelText("Concepto")).toHaveValue("aceite");
    expect(push).not.toHaveBeenCalled();

    await userEvent.clear(within(sheet).getByLabelText("Fecha operativa desde"));
    await userEvent.type(within(sheet).getByLabelText("Fecha operativa desde"), "2026-08-01");
    await userEvent.click(within(sheet).getByRole("button", { name: "Ver resultados" }));

    expect(push).toHaveBeenCalledExactlyOnceWith(canonical);
  });
});
