import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const listWorkersMock = vi.hoisted(() => vi.fn());
const createWorkerFromFormMock = vi.hoisted(() => vi.fn());
const updateWorkerFromFormMock = vi.hoisted(() => vi.fn());
const setWorkerActiveFromFormMock = vi.hoisted(() => vi.fn());
const deleteWorkerFromFormMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/workers/queries", () => ({
  listWorkers: listWorkersMock,
}));

vi.mock("@/features/workers/actions", () => ({
  createWorkerFromForm: createWorkerFromFormMock,
  updateWorkerFromForm: updateWorkerFromFormMock,
  setWorkerActiveFromForm: setWorkerActiveFromFormMock,
  deleteWorkerFromForm: deleteWorkerFromFormMock,
}));


import WorkersPage from "./page";

describe("WorkersPage", () => {
  it("renders the page header with the single create action and the active/inactive catalog", async () => {
    listWorkersMock.mockResolvedValue([
      {
        id: "worker-1",
        displayName: "Ana López",
        username: "ana.lopez",
        email: "ana.lopez@sebasam.local",
        workerKind: "MASTER",
        isActive: true,
        _count: { assignments: 2 },
      },
      {
        id: "worker-2",
        displayName: "Luis Pérez",
        username: "luis.perez",
        email: "luis.perez@sebasam.local",
        workerKind: "HELPER",
        isActive: false,
        _count: { assignments: 0 },
      },
    ]);

    const page = await WorkersPage({ searchParams: Promise.resolve({}) });
    render(page);

    const header = screen.getByTestId("page-header");
    expect(within(header).getByRole("heading", { level: 1, name: "Trabajadores" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Crear trabajador" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Crear trabajador" })).toHaveLength(1);
    expect(screen.queryByTestId("worker-create-form")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Filtrar trabajadores" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activos" })).toHaveAttribute("href", "/admin/workers?status=ACTIVE");
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("2 trabajos activos")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(listWorkersMock).toHaveBeenCalledWith({ query: "", status: "ALL" });
  });
});
