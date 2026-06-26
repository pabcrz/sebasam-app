import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());
const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import RootPage from "./page";

describe("RootPage", () => {
  it("redirects authenticated users to /admin", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    redirectMock.mockImplementation(() => {
      throw new Error("redirect:/admin");
    });

    await expect(RootPage()).rejects.toThrow("redirect:/admin");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("redirects unauthenticated users to /admin/login", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("redirect:/admin/login");
    });

    await expect(RootPage()).rejects.toThrow("redirect:/admin/login");
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });
});
