import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUser = vi.hoisted(() => vi.fn());
const profileUpdate = vi.hoisted(() => vi.fn());
const requireProfileForPasswordChange = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireProfileForPasswordChange }));
vi.mock("@/lib/prisma", () => ({ prisma: { userProfile: { update: profileUpdate } } }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { updateUser } })),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { changePassword } from "./actions";

function passwordForm(password = "new-password") {
  const formData = new FormData();
  formData.set("password", password);
  formData.set("confirmation", password);
  return formData;
}

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireProfileForPasswordChange.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("keeps the profile locked and hides password details when Auth rejects the update", async () => {
    updateUser.mockResolvedValue({ error: new Error("Auth rejected") });
    const password = "new-password";

    const result = await changePassword(passwordForm(password));

    expect(profileUpdate).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "No se pudo actualizar la contraseña. Inténtalo de nuevo." });
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it("updates Auth, clears the flag, then redirects without persisting the password", async () => {
    const calls: string[] = [];
    updateUser.mockImplementation(async () => {
      calls.push("auth");
      return { error: null };
    });
    profileUpdate.mockImplementation(async () => {
      calls.push("prisma");
      return {};
    });
    redirect.mockImplementation((path: string): never => {
      calls.push(`redirect:${path}`);
      throw new Error(`redirect:${path}`);
    });

    await expect(changePassword(passwordForm())).rejects.toThrow("redirect:/admin");

    expect(calls).toEqual(["auth", "prisma", "redirect:/admin"]);
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { mustChangePassword: false },
    });
    expect(JSON.stringify(profileUpdate.mock.calls)).not.toContain("new-password");
  });
});
