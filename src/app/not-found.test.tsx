import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders the branded 404 recovery content without internal navigation", () => {
    const { container } = render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le zafó un tornillo" })).toBeInTheDocument();
    expect(screen.getByText("No encontramos lo que buscas. Puede que se haya movido o ya no exista.")).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de SEBASAM" })).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByRole("heading", { name: "SEBASAM", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visita SEBASAM" })).toHaveAttribute("href", "https://sebasam.online");
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /engranaje/i })).toBeInTheDocument();

    const card = container.querySelector("main > div");
    const main = screen.getByRole("main");
    const header = card?.querySelector("header");
    const content = card?.querySelector(":scope > div:nth-child(2)");
    const footer = card?.querySelector(":scope > footer");

    expect(card).not.toHaveClass("p-[var(--space-md)]");
    expect(card).not.toHaveClass(
      "border",
      "rounded-[var(--radius-md)]",
      "bg-[var(--color-surface)]",
      "shadow-[var(--shadow-card)]",
    );
    expect(card).toHaveClass(
      "md:border",
      "md:rounded-[var(--radius-md)]",
      "md:border-[var(--color-border-subtle)]",
      "md:bg-[var(--color-surface)]",
      "md:shadow-[var(--shadow-card)]",
    );
    expect(header).toHaveClass(
      "bg-[image:var(--gradient-primary)]",
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
      "pt-[max(var(--space-md),env(safe-area-inset-top))]",
      "pb-[var(--space-md)]",
      "md:px-[var(--space-xl)]",
      "md:py-[var(--space-md)]",
    );
    expect(card).toHaveClass("flex-1", "md:flex-initial");
    expect(content).toHaveClass(
      "flex-1",
      "justify-center",
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
      "md:px-[var(--space-xl)]",
      "pt-[var(--space-md)]",
      "md:pt-[var(--space-xl)]",
    );
    expect(content).toHaveClass("gap-[var(--space-sm)]", "md:gap-[var(--space-md)]");
    expect(main).toHaveClass("min-h-dvh", "flex-col");
    expect(card?.firstElementChild).toBe(header);
    expect(content?.nextElementSibling).toBe(footer);
    expect(footer).toHaveClass(
      "mt-auto",
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
      "md:px-[var(--space-xl)]",
      "pt-[var(--space-md)]",
    );
    expect(footer).toHaveClass("pb-[max(24px,env(safe-area-inset-bottom))]", "md:pb-[var(--space-xl)]");
    expect(footer).toContainElement(screen.getByRole("link", { name: "Visita SEBASAM" }));
    expect(main).toHaveClass("px-0", "pt-0");
    expect(main).toHaveClass(
      "md:pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "md:pr-[max(var(--space-md),env(safe-area-inset-right))]",
    );
    expect(card).toHaveClass("w-full", "md:max-w-[420px]");
    expect(header).toHaveClass(
      "pt-[max(var(--space-md),env(safe-area-inset-top))]",
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
    );
    expect(content).toHaveClass(
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
    );
    expect(footer).toHaveClass(
      "pl-[max(var(--space-md),env(safe-area-inset-left))]",
      "pr-[max(var(--space-md),env(safe-area-inset-right))]",
    );
  });
});
