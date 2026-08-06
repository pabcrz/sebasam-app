import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { listActiveWorkers, listWorkers } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

describe("worker queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-1" },
    });
    (prisma.userProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("lists active and inactive workers with optional search", async () => {
    await listWorkers({ query: "Ana", status: "INACTIVE" });

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        role: "WORKER",
        isActive: false,
        OR: expect.arrayContaining([
          { displayName: { contains: "Ana", mode: "insensitive" } },
        ]),
      }),
    }));
  });

  it("exposes only classified active workers for assignment selectors", async () => {
    await listActiveWorkers();

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        role: "WORKER",
        isActive: true,
        workerKind: { not: null },
      },
      orderBy: [{ workerKind: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        workerKind: true,
      },
    });
  });
});
