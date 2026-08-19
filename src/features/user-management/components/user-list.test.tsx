import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UserProfile } from "@prisma/client";
import { UserList } from "./user-list";

// Mock server actions to avoid direct dependencies
vi.mock("../actions", () => ({
  updateUserRole: vi.fn(),
  toggleUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
}));

const mockUsers: UserProfile[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    username: "admin1",
    email: "admin1@sebasam.local",
    displayName: "Admin One",
    role: "SUPER_ADMIN",
    workerKind: null,
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    username: "worker1",
    email: "worker1@sebasam.local",
    displayName: "Worker One",
    role: "WORKER",
    workerKind: "MASTER",
    isActive: false,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("UserList", () => {
  it("renders the list of users", () => {
    render(<UserList users={mockUsers} currentUserId="00000000-0000-0000-0000-000000000001" />);

    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getByText("admin1")).toBeInTheDocument();
    
    expect(screen.getByText("Worker One")).toBeInTheDocument();
    expect(screen.getByText("worker1")).toBeInTheDocument();
    
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("disables state toggle and role change for the current user if SUPER_ADMIN", () => {
    render(<UserList users={mockUsers} currentUserId="00000000-0000-0000-0000-000000000001" />);

    const buttons = screen.getAllByRole("button");
    const deactivateButton = buttons.find(b => b.textContent === "Desactivar");
    expect(deactivateButton).toBeDisabled();

    // The select trigger for the current user's role should also be disabled
    const roleSelect = screen.getByLabelText("Rol de admin1");
    expect(roleSelect).toBeDisabled();
  });
  
  it("enables actions for other users", () => {
    render(<UserList users={mockUsers} currentUserId="00000000-0000-0000-0000-000000000001" />);

    const buttons = screen.getAllByRole("button");
    const activateButton = buttons.find(b => b.textContent === "Activar");
    expect(activateButton).not.toBeDisabled();

    const roleSelect = screen.getByLabelText("Rol de worker1");
    expect(roleSelect).not.toBeDisabled();
  });
});
