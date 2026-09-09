import { describe, expect, it, vi } from "vitest";
import { formatCompletionNotificationMessage, notifyCustomerWorkOrderCompleted } from "./notifications";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workOrder: {
      findUnique: vi.fn(),
    },
  },
}));

describe("notifications", () => {
  it("formats completion notification message with due date in CDMX", () => {
    const message = formatCompletionNotificationMessage({
      customerName: "Transportes del Norte",
      workOrderNumber: "OT-0042",
      paymentDueDate: new Date("2026-09-16T18:00:00Z"),
    });

    expect(message).toContain("Transportes del Norte");
    expect(message).toContain("OT-0042");
    expect(message).toContain("2026-09-16");
  });

  it("dispatches notification using customer and contact data", async () => {
    (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wo-1",
      number: "OT-100",
      completedAt: new Date("2026-09-09T16:00:00Z"),
      paymentDueDate: new Date("2026-09-16T18:00:00Z"),
      quote: {
        customer: {
          id: "cust-1",
          name: "Empresa S.A.",
          commercialName: "Comercializadora Regia",
          phone: "5512345678",
          contacts: [{ id: "ct-1", phone: "5587654321", role: "DRIVER", isActive: true }],
        },
      },
    });

    const result = await notifyCustomerWorkOrderCompleted("wo-1");

    expect(result).toMatchObject({
      workOrderId: "wo-1",
      workOrderNumber: "OT-100",
      customerId: "cust-1",
      customerName: "Comercializadora Regia",
      phone: "5512345678",
      paymentDueDate: expect.any(Date),
      message: expect.stringContaining("OT-100"),
    });
  });
});
