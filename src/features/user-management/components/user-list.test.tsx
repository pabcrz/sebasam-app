import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserProfile } from "@/generated/prisma/client";
import { UserList } from "./user-list";
import { resetUserPassword, toggleUserStatus, updateUserRole } from "../actions";

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

const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000001";

const mockUsers: UserProfile[] = [
  {
    id: CURRENT_USER_ID,
    username: "admin1",
    email: "admin1@sebasam.local",
    displayName: "Admin One",
    role: "SUPER_ADMIN",
    workerKind: null,
    fixedWeeklyPayCents: null,
    fixedDailyPayCents: null,
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
    fixedWeeklyPayCents: null,
    fixedDailyPayCents: null,
    isActive: false,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function renderList() {
  return render(<UserList users={mockUsers} currentUserId={CURRENT_USER_ID} />);
}

async function openSheet(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: `Editar a ${name}` }));
  return screen.getByRole("dialog", { name: "Editar usuario" });
}

describe("UserList", () => {
  it("renders each user as a row with role and username, and marks only inactive users", () => {
    renderList();

    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getByText("Super Admin · @admin1")).toBeInTheDocument();
    expect(screen.getByText("Worker One")).toBeInTheDocument();
    expect(screen.getByText("Trabajador · @worker1")).toBeInTheDocument();
    expect(screen.getAllByText("Inactivo")).toHaveLength(1);
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resetear Pass" })).not.toBeInTheDocument();
  });

  it("opens an edit sheet from the whole row with Cancelar left and Guardar right", async () => {
    const user = userEvent.setup();
    renderList();

    const sheet = await openSheet(user, "Worker One");

    const footer = sheet.querySelector("[data-dialog-footer]") as HTMLElement;
    expect(within(footer).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Cancelar",
      "Guardar",
    ]);
  });

  it("keeps Desactivar in the danger zone, disabled for the current user", async () => {
    const user = userEvent.setup();
    renderList();

    const sheet = await openSheet(user, "Admin One");

    const zone = sheet.querySelector("[data-dialog-danger-zone]") as HTMLElement;
    const deactivate = within(zone).getByRole("button", { name: "Desactivar" });
    expect(deactivate).toBeDisabled();
    expect(deactivate).toHaveClass("bg-transparent", "border-[var(--color-status-danger-border)]");
    expect(within(sheet).getByLabelText("Rol de admin1")).toBeDisabled();
  });

  it("offers activation for inactive users outside the danger zone", async () => {
    const user = userEvent.setup();
    renderList();

    const sheet = await openSheet(user, "Worker One");

    const zone = sheet.querySelector("[data-dialog-danger-zone]");
    expect(zone).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Activar" })).not.toBeDisabled();
    expect(within(sheet).getByLabelText("Rol de worker1")).not.toBeDisabled();
  });

  it("saves a changed role from Guardar and leaves the sheet", async () => {
    const user = userEvent.setup();
    vi.mocked(updateUserRole).mockResolvedValue({ success: true } as never);
    renderList();

    const sheet = await openSheet(user, "Worker One");
    await user.click(within(sheet).getByLabelText("Rol de worker1"));
    await user.click(await screen.findByRole("option", { name: "Admin" }));
    await user.click(within(sheet).getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(updateUserRole).toHaveBeenCalledWith({
        userId: "00000000-0000-0000-0000-000000000002",
        role: "ADMIN",
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("resets the password from the sheet with its own button and the 8-character rule", async () => {
    const user = userEvent.setup();
    vi.mocked(resetUserPassword).mockResolvedValue(undefined as never);
    renderList();

    const sheet = await openSheet(user, "Worker One");

    await user.type(within(sheet).getByLabelText("Nueva contraseña"), "corta");
    await user.click(within(sheet).getByRole("button", { name: "Restablecer contraseña" }));
    expect(within(sheet).getByRole("alert")).toHaveTextContent("La contraseña debe tener al menos 8 caracteres.");
    expect(resetUserPassword).not.toHaveBeenCalled();

    await user.clear(within(sheet).getByLabelText("Nueva contraseña"));
    await user.type(within(sheet).getByLabelText("Nueva contraseña"), "newpassword123");
    await user.click(within(sheet).getByRole("button", { name: "Restablecer contraseña" }));

    await waitFor(() => {
      expect(resetUserPassword).toHaveBeenCalledWith({
        userId: "00000000-0000-0000-0000-000000000002",
        newPassword: "newpassword123",
      });
    });
  });

  it("deactivates a user from the danger zone and closes the sheet", async () => {
    const user = userEvent.setup();
    vi.mocked(toggleUserStatus).mockResolvedValue({ success: true } as never);
    render(<UserList users={[{ ...mockUsers[1], isActive: true }]} currentUserId={CURRENT_USER_ID} />);

    const sheet = await openSheet(user, "Worker One");
    await user.click(within(sheet).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => {
      expect(toggleUserStatus).toHaveBeenCalledWith({
        userId: "00000000-0000-0000-0000-000000000002",
        isActive: false,
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
