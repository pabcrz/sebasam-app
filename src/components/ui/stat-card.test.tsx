import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "./stat-card";

describe("StatCard UI component", () => {
  it("renders label, value, description and icon", () => {
    render(
      <StatCard
        label="Total Ventas"
        value="$12,500.00"
        description="Monto acumulado del mes"
        icon={<Icon name="cash" className="h-4 w-4" data-testid="banknote-icon" />}
      />
    );

    expect(screen.getByText("Total Ventas")).toBeInTheDocument();
    expect(screen.getByText("$12,500.00")).toBeInTheDocument();
    expect(screen.getByText("Monto acumulado del mes")).toBeInTheDocument();
    expect(screen.getByTestId("banknote-icon")).toBeInTheDocument();
  });

  it("renders a zero value without breaking geometry", () => {
    render(<StatCard label="Cobros" value="$0.00" numericRole="currency" />);

    const value = screen.getByText("$0.00");
    expect(value).toBeInTheDocument();
    expect(value).toHaveAttribute("data-numeric-role", "currency");
    expect(value).toHaveClass("min-w-0", "font-mono", "tabular-nums");
  });

  it("applies the icon variant container to the icon", () => {
    render(
      <StatCard
        label="Ventas"
        value="10"
        icon={<Icon name="cash" className="h-4 w-4" data-testid="icon" aria-hidden="true" />}
        iconVariant="success"
      />
    );

    expect(screen.getByTestId("icon").parentElement).toHaveClass(
      "bg-[var(--color-status-success-bg)]",
      "text-[var(--color-status-success-fg)]",
    );
  });

  it("applies numeric role and typography when numericRole is set", () => {
    render(<StatCard label="Ingresos" value="$1,500.00" numericRole="currency" />);

    const value = screen.getByText("$1,500.00");
    expect(value).toHaveAttribute("data-numeric-role", "currency");
    expect(value).toHaveClass("text-xl", "sm:text-2xl", "tabular-nums", "font-mono");
  });

  it("constrains numeric content so long values can wrap inside the card", () => {
    render(<StatCard label="Ingresos" value="$123,456,789.00" numericRole="currency" />);

    expect(screen.getByText("$123,456,789.00")).toHaveClass("min-w-0", "flex-1", "break-words");
  });

  it("renders an accessible trend with direction icon and visible label", () => {
    render(
      <StatCard
        label="Ventas"
        value="$500"
        trend={{ direction: "up", label: "+12% vs. semana anterior" }}
      />
    );

    const label = screen.getByText("+12% vs. semana anterior");
    expect(label).toBeInTheDocument();
    // The trend icon is decorative and hidden from assistive tech; the label carries the meaning.
    expect(label.previousSibling).toHaveAttribute("aria-hidden", "true");
  });

  it("renders trailing action content next to the value", () => {
    render(
      <StatCard label="Cola" value="3" action={<span>Ver detalles</span>} />
    );

    expect(screen.getByText("Ver detalles")).toBeInTheDocument();
    expect(screen.getByText("3").parentElement).toHaveTextContent("3Ver detalles");
  });
});
