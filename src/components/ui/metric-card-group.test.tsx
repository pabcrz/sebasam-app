import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCardGroup } from "./metric-card-group";
import { StatCard } from "./stat-card";

describe("MetricCardGroup", () => {
  it("composes metric cards in a responsive grid", () => {
    render(
      <MetricCardGroup columns={4} data-testid="group">
        <StatCard label="A" value="1" />
        <StatCard label="B" value="2" />
      </MetricCardGroup>
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveClass("grid", "grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-4", "gap-4");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the empty state instead of children when empty is true", () => {
    render(
      <MetricCardGroup
        empty
        emptyTitle="Sin métricas"
        emptyDescription="No hay datos para este período."
      >
        <StatCard label="A" value="1" />
      </MetricCardGroup>
    );

    expect(screen.getByText("Sin métricas")).toBeInTheDocument();
    expect(screen.getByText("No hay datos para este período.")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders loading skeletons when loading is true", () => {
    const { container } = render(<MetricCardGroup loading loadingCount={3} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(12); // 3 cards x 4 skeletons
  });

  it("keeps geometry with long values via min-w-0 cells", () => {
    render(
      <MetricCardGroup columns={4}>
        <StatCard label="Total" value="$12,345,678,901.23" numericRole="currency" />
      </MetricCardGroup>
    );

    const value = screen.getByText("$12,345,678,901.23");
    expect(value).toHaveClass("min-w-0");
    expect(value.closest("[class*=grid]")).toHaveClass("min-w-0");
  });
});