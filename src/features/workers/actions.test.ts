import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  createWorker,
  setWorkerActiveFromForm,
  setWorkerActive,
  updateWorker,
  updateWorkerFromForm,
} from "./actions";
import { DuplicateWorkerError } from "./domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const workerInput = {
  displayName: "Ana López",
  username: "ana.lopez",
  email: "ana.lopez@sebasam.local",
  workerKind: "MASTER" as const,
};

describe("worker actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-1" },
    });
    (prisma.userProfile.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "worker-1",
      ...workerInput,
      role: "WORKER",
      isActive: true,
    });
    (prisma.userProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "worker-1" });
    (prisma.userProfile.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "worker-1",
      ...workerInput,
    });
  });

  it("creates a WORKER profile without creating an auth user", async () => {
    await createWorker(workerInput);

    expect(requireOperationalRole).toHaveBeenCalledOnce();
    expect(prisma.userProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        role: "WORKER",
        workerKind: "MASTER",
        isActive: true,
      }),
    });
  });

  it("rejects duplicate username or email errors from the database", async () => {
    (prisma.userProfile.create as ReturnType<typeof vi.fn>).mockRejectedValue({ code: "P2002" });

    await expect(createWorker(workerInput)).rejects.toBeInstanceOf(DuplicateWorkerError);
  });

  it("updates worker profile data while preserving the worker role", async () => {
    await updateWorker("worker-1", { ...workerInput, workerKind: "HELPER" });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { id: "worker-1" },
      data: expect.objectContaining({
        displayName: "Ana López",
        workerKind: "HELPER",
        role: "WORKER",
      }),
    });
  });

  it("persists editable fixed-pay rates for a helper", async () => {
    await updateWorker("worker-1", {
      ...workerInput,
      workerKind: "HELPER",
      fixedWeeklyPayCents: 6_00000,
      fixedDailyPayCents: 1_00000,
    });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { id: "worker-1" },
      data: expect.objectContaining({
        workerKind: "HELPER",
        fixedWeeklyPayCents: 6_00000,
        fixedDailyPayCents: 1_00000,
      }),
    });
  });

  it("deactivates through a status update and never deletes history", async () => {
    await setWorkerActive("worker-1", false);

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { id: "worker-1" },
      data: { isActive: false },
    });
    expect(prisma.userProfile).not.toHaveProperty("delete");
  });

  it("stops before Prisma when the caller lacks an operational role", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(createWorker(workerInput)).rejects.toThrow("Unauthorized");
    expect(prisma.userProfile.create).not.toHaveBeenCalled();
  });

  it("redirects modal validation errors back to the worker list", async () => {
    (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const formData = new FormData();
    formData.set("returnTo", "/admin/workers");
    formData.set("username", "ana.lopez");
    formData.set("workerKind", "MASTER");

    await expect(updateWorkerFromForm("worker-1", formData)).rejects.toThrow(
      "redirect:/admin/workers?error=invalid",
    );
  });

  it("refreshes the worker list after a modal activation change", async () => {
    (redirect as unknown as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    const formData = new FormData();
    formData.set("isActive", "false");
    formData.set("returnTo", "/admin/workers");

    await expect(setWorkerActiveFromForm("worker-1", formData)).rejects.toThrow(
      "redirect:/admin/workers?updated=1",
    );
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { id: "worker-1" },
      data: { isActive: false },
    });
  });
});
