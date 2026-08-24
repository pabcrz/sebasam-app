import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClipboardList } from "lucide-react";
import { AdminPageHeader } from "./admin-page-header";

describe("AdminPageHeader", () => {
  it("renders the shared heading hierarchy, context, and optional action", () => {
    render(
      <AdminPageHeader
        icon={ClipboardList}
        eyebrow="Ejecución activa"
        title="Trabajos en ejecución"
        description="Consulta y finaliza las órdenes activas."
        actions={<button type="button">Nueva cotización</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Trabajos en ejecución" })).toBeInTheDocument();
    expect(screen.getByText("Ejecución activa")).toBeInTheDocument();
    expect(screen.getByText("Consulta y finaliza las órdenes activas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva cotización" })).toBeInTheDocument();
  });
});
