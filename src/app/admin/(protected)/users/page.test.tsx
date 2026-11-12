import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listUsers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const requireSuperAdmin = vi.hoisted(() => vi.fn().mockResolvedValue({ user: { id: "u1" } }));

vi.mock("@/features/user-management/queries", () => ({ listUsers }));
vi.mock("@/lib/auth/session", () => ({ requireSuperAdmin }));
vi.mock("@/features/user-management/actions", () => ({ createUser: vi.fn() }));
vi.mock("@/features/user-management/components/user-create-dialog", () => ({
  UserCreateDialog: () => <button type="button">Crear usuario</button>,
}));
vi.mock("@/features/user-management/components/user-list", () => ({ UserList: () => null }));

import UsersPage from "./page";

describe("UsersPage", () => {
  it("renders the page header with the single create action and no subtitle card", async () => {
    render(await UsersPage());

    const header = screen.getByTestId("page-header");
    expect(within(header).getByRole("heading", { level: 1, name: "Gestión de Usuarios" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Crear usuario" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Crear usuario" })).toHaveLength(1);
    expect(screen.queryByText("Usuarios registrados")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no users", async () => {
    render(await UsersPage());

    expect(screen.getByText("No hay usuarios registrados.")).toBeInTheDocument();
  });
});
