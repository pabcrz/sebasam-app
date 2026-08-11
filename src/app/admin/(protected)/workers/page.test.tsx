import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  it("renders a create modal trigger and active/inactive catalog", async () => {
    listWorkersMock.mockResolvedValue([
      {
        id: "worker-1",
        displayName: "Ana López",
        username: "ana.lopez",
        email: "ana.lopez@sebasam.local",
        workerKind: "MASTER",
        isActive: true,
      },
      {
        id: "worker-2",
        displayName: "Luis Pérez",
        username: "luis.perez",
        email: "luis.perez@sebasam.local",
        workerKind: "HELPER",
        isActive: false,
      },
    ]);

    const page = await WorkersPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("heading", { name: "Trabajadores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear trabajador" })).toBeInTheDocument();
    expect(screen.queryByTestId("worker-create-form")).not.toBeInTheDocument();
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(listWorkersMock).toHaveBeenCalledWith({ query: "", status: "ALL" });
  });
});
