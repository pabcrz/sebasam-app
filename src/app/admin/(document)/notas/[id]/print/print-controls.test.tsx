import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("returnTo=/admin/notas") }));

import { PrintControls } from "@/features/quotes/components/print-controls";

describe("PrintControls", () => {
  it("returns to the notes list", () => {
    render(<PrintControls backLabel="Volver a la nota" />);

    expect(screen.getByRole("link", { name: "Volver a la nota" })).toHaveAttribute("href", "/admin/notas");
  });
});
