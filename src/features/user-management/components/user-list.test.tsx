import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserProfile } from "@prisma/client";
import { UserList } from "./user-list";
import { resetUserPassword } from "../actions";

// Mock server actions to avoid direct dependencies
vi.mock("../actions", () => ({
  updateUserRole: vi.fn(),
  toggleUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
}));

// Mock PointerEvent to prevent Radix Select errors
if (typeof global.PointerEvent === "undefined") {
  class MockPointerEvent extends MouseEvent {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0;
    tangentialPressure = 0;
    tiltX = 0;
    tiltY = 0;
    twist = 0;
    pointerType = "mouse";
    isPrimary = true;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      Object.assign(this, params);
    }
  }
  global.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
}

if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
    const deactivateButton = buttons.find((b) => b.textContent === "Desactivar");
    expect(deactivateButton).toBeDisabled();

    // The select trigger for the current user's role should also be disabled
    const roleSelect = screen.getByLabelText("Rol de admin1");
    expect(roleSelect).toBeDisabled();
  });

  it("enables actions for other users", () => {
    render(<UserList users={mockUsers} currentUserId="00000000-0000-0000-0000-000000000001" />);

    const buttons = screen.getAllByRole("button");
    const activateButton = buttons.find((b) => b.textContent === "Activar");
    expect(activateButton).not.toBeDisabled();

    const roleSelect = screen.getByLabelText("Rol de worker1");
    expect(roleSelect).not.toBeDisabled();
  });

  it("opens password reset dialog and calls resetUserPassword", async () => {
    const user = userEvent.setup();
    vi.mocked(resetUserPassword).mockResolvedValue(undefined as never);

    render(<UserList users={mockUsers} currentUserId="00000000-0000-0000-0000-000000000001" />);

    const resetButtons = screen.getAllByRole("button", { name: "Resetear Pass" });
    await user.click(resetButtons[1]); // worker1

    const dialog = screen.getByRole("dialog", { name: "Restablecer contraseña" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Worker One")).toBeInTheDocument();

    const passInput = screen.getByLabelText("Nueva contraseña");
    await user.type(passInput, "newpassword123");

    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => {
      expect(resetUserPassword).toHaveBeenCalledWith({
        userId: "00000000-0000-0000-0000-000000000002",
        newPassword: "newpassword123",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
