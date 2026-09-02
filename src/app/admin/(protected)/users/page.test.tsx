import { render, screen } from "@testing-library/react";
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
  it("renders the production subtle heading, description, card title and create triggers", async () => {
    render(await UsersPage());

    expect(screen.getByRole("heading", { level: 1, name: "Gestión de Usuarios" })).toBeInTheDocument();
    expect(
      screen.getByText("Alta, roles, estado y contraseñas de usuarios. Exclusivo para Super Admin."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Usuarios registrados" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Crear usuario" })).toHaveLength(2);
  });
});
