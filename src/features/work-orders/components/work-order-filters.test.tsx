import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
function view(input: Record<string, unknown> = {}) {
  return <WorkOrderFilters filters={parseWorkOrderParams(input)} customers={customers} workers={workers} />;
}
async function expand() {
  await userEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));
}

describe("WorkOrderFilters", () => {
  beforeEach(() => push.mockClear());

  it("combines every supported criterion, labels dates and resets page on submission", async () => {
    render(view(criteria));
    for (const summary of ["Folio: OT-42", "Concepto: aceite", "Cliente: Taller de prueba", "Placas: ABC-123", "ECO: ECO-42", "Ejecución: Pendiente de asignación", "Responsable: Maestro de prueba", "Fecha operativa desde: 2026-08-01", "Fecha operativa hasta: 2026-08-31", "Programación desde: 2026-09-01", "Programación hasta: 2026-09-30"]) {
      expect(screen.getByText(summary, { exact: true })).toBeInTheDocument();
    }
    await expand();
    expect(screen.getByText("Fecha operativa de cotización (ambos días incluidos)")).toBeInTheDocument();
    expect(screen.getByText("Programación (ambos días incluidos; Ciudad de México)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tipo de operación")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mostrar archivadas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mostrar canceladas")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith(`/admin/work-orders?number=OT-42&concept=aceite&customerId=customer-1&plate=ABC-123&economicNumber=ECO-42&dateFrom=2026-08-01&dateTo=2026-08-31&execution=PLANNED&assignee=${workerId}&scheduledFrom=2026-09-01&scheduledTo=2026-09-30`);
  });

  it.each([
    ["PLANNED", "Pendiente de asignación", "workshop", "Taller especial"],
    ["ASSIGNED", "Asignado", workerId, "Maestro de prueba"],
    ["IN_PROGRESS", "En ejecución", "all", "Todos"],
  ])("derives %s and responsible selections from the URL model", async (execution, label, assignee, responsible) => {
    render(view({ execution, assignee }));
    await expand();
    expect(screen.getByRole("combobox", { name: "Ejecución" })).toHaveTextContent(label);
    expect(screen.getByRole("combobox", { name: "Responsable" })).toHaveTextContent(responsible);
    expect(screen.getByText(`Ejecución: ${label}`)).toBeInTheDocument();
  });

  it.each([
    ["Fecha operativa desde", "Fecha operativa hasta", "La fecha operativa desde no puede ser posterior a hasta"],
    ["Programación desde", "Programación hasta", "La programación desde no puede ser posterior a hasta"],
  ])("rejects inverted %s without navigation and retains correction fields", async (from, to, message) => {
    render(view());
    await expand();
    await userEvent.type(screen.getByLabelText(from), "2026-09-30");
    await userEvent.type(screen.getByLabelText(to), "2026-09-01");
    await userEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(from)).toHaveValue("2026-09-30");
    expect(screen.getByLabelText(to)).toHaveValue("2026-09-01");
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/work-orders");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refreshes fields and summary from URL props and clears all criteria deliberately", async () => {
    const { rerender } = render(view(criteria));
    await expand();
    rerender(view({ concept: "frenos", assignee: "workshop" }));
    expect(screen.getByLabelText("Concepto")).toHaveValue("frenos");
    expect(screen.getByLabelText("Folio")).toHaveValue("");
    expect(screen.queryByText("Concepto: aceite")).not.toBeInTheDocument();
    expect(screen.getByText("Responsable: Taller especial")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(push).toHaveBeenCalledExactlyOnceWith("/admin/work-orders");
    rerender(view());
    expect(screen.getByText("Sin filtros activos")).toBeInTheDocument();
  });

  it.each([
    ["operational", "dateFrom", "Fecha operativa desde", "2026-09-01", "2026-08-01", "La fecha operativa"],
    ["scheduled", "scheduledFrom", "Programación desde", "2026-10-01", "2026-09-01", "La programación"],
  ] as const)("opens rejected incoming %s dates and submits only after correction", async (kind, key, label, invalid, corrected, message) => {
    const dates = { dateFrom: criteria.dateFrom, dateTo: criteria.dateTo, scheduledFrom: criteria.scheduledFrom, scheduledTo: criteria.scheduledTo, [key]: invalid };
    render(<WorkOrderFilters filters={parseWorkOrderParams({ ...criteria, dateFrom: undefined, dateTo: undefined, scheduledFrom: undefined, scheduledTo: undefined })}
      customers={customers} workers={workers} rejectedRange={{ kind, dates }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(label)).toHaveValue(invalid);
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    expect(push).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText(label));
    await userEvent.type(screen.getByLabelText(label), corrected);
    await userEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledExactlyOnceWith(`/admin/work-orders?number=OT-42&concept=aceite&customerId=customer-1&plate=ABC-123&economicNumber=ECO-42&dateFrom=2026-08-01&dateTo=2026-08-31&execution=PLANNED&assignee=${workerId}&scheduledFrom=2026-09-01&scheduledTo=2026-09-30`);
  });
});
