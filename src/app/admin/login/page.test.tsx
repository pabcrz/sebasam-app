import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const loginAdminMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/features/auth/actions", () => ({
  loginAdmin: loginAdminMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import AdminLoginPage from "./page";

describe("AdminLoginPage", () => {
  it("redirects authenticated users to /admin", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    redirectMock.mockImplementation(() => {
      throw new Error("redirect:/admin");
    });

    await expect(AdminLoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "redirect:/admin",
    );
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("renders the login form with required fields", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await AdminLoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument();
  });

  it("displays the error message when an error code is provided", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await AdminLoginPage({ searchParams: Promise.resolve({ error: "invalid" }) });
    render(page);

    expect(
      screen.getByRole("alert", { name: "" }),
    ).toHaveTextContent("El usuario o la contraseña son incorrectos.");
  });
});
