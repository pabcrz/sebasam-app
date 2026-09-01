import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClipboardList } from "lucide-react";
import { AdminPageHeader } from "./admin-page-header";

describe("AdminPageHeader", () => {
  it("renders only the shared icon and title", () => {
    const { container } = render(
      <AdminPageHeader
        icon={ClipboardList}
        title="Trabajos"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Trabajos" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders an expanded hierarchy with distinct composition spacing", () => {
    const { container } = render(
      <AdminPageHeader
        icon={ClipboardList}
        title="Configuración"
        description="Administra los datos visibles para clientes."
        actions={<button type="button">Guardar</button>}
        variant="expanded"
      >
        <span>Información del negocio</span>
      </AdminPageHeader>,
    );

    const header = container.querySelector('[data-testid="admin-page-header"]');
    expect(header).toHaveAttribute("data-variant", "expanded");
    expect(header).toHaveClass("p-6");
    expect(screen.getByRole("heading", { name: "Configuración" })).toHaveClass("text-xl");
    expect(screen.getByText("Administra los datos visibles para clientes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByText("Información del negocio")).toBeInTheDocument();
  });

  it("keeps actions and description available in the compact variant", () => {
    render(
      <AdminPageHeader
        icon={ClipboardList}
        title="Trabajos"
        description="Órdenes activas"
        actions={<button type="button">Nuevo</button>}
        variant="compact"
      />,
    );

    expect(screen.getByRole("heading", { name: "Trabajos" })).toBeInTheDocument();
    expect(screen.getByText("Órdenes activas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo" })).toBeInTheDocument();
  });

  it("preserves compact alignment and spacing by default", () => {
    const { container } = render(<AdminPageHeader icon={ClipboardList} title="Trabajos" />);
    const header = container.querySelector('[data-testid="admin-page-header"]');
    expect(header).toHaveAttribute("data-variant", "compact");
    expect(header).toHaveClass("p-4");
    expect(header?.querySelector("[class*=items-center]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trabajos" })).toHaveClass("text-lg");
  });

  it("keeps every current modal, preview, and workspace owner import-bound to dialog headers", async () => {
    const currentOwners = [
      "@/components/ui/dialog",
      "@/components/ui/confirm-dialog",
      "@/features/quotes/components/quote-builder-dialog",
      "@/features/workers/components/worker-edit-dialog",
      "@/features/customers/components/customer-create-form",
      "@/features/customers/components/customer-detail-dialog",
      "@/features/workers/components/worker-create-dialog",
      "@/features/quotes/components/quote-preview-dialog",
      "@/features/quotes/components/quote-lifecycle-form",
       "@/features/quotes/components/quote-correct-decision-form",
       "@/features/quotes/components/quote-authorize-form",
       "@/features/quotes/components/quote-approval-form",
       "@/features/payments/components/cash-payment-dialog",
      "@/features/payment-requests/components/payment-request-link-dialog",
      "@/features/work-orders/components/work-order-operations-dialog",
    ];
    // MultiStepDialog is intentionally future scope: no current owner source exists.

    vi.resetModules();
    vi.doMock("@/components/admin-page-header", () => {
      throw new Error("A dialog owner must not import AdminPageHeader");
    });

    try {
      for (const owner of currentOwners) {
        const ownerModule = await import(owner);
        expect(Object.keys(ownerModule).length, `${owner} must resolve at runtime`).toBeGreaterThan(0);
      }
    } finally {
      vi.doUnmock("@/components/admin-page-header");
    }
  });
});
