import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banknote } from "lucide-react";
import { StatCard } from "./stat-card";

describe("StatCard UI component", () => {
  it("renders label, value, description and icon", () => {
    render(
      <StatCard
        label="Total Ventas"
        value="$12,500.00"
        description="Monto acumulado del mes"
        icon={<Banknote className="h-4 w-4" data-testid="banknote-icon" />}
      />
    );

    expect(screen.getByText("Total Ventas")).toBeInTheDocument();
    expect(screen.getByText("$12,500.00")).toBeInTheDocument();
    expect(screen.getByText("Monto acumulado del mes")).toBeInTheDocument();
    expect(screen.getByTestId("banknote-icon")).toBeInTheDocument();
  });
});
